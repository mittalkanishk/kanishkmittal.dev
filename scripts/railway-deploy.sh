#!/usr/bin/env bash
# Points the Railway service at a published image, starts a deployment and
# waits for it to finish.
#
# Required env:
#   IMAGE                    image to deploy, e.g. user/repo:v1.2.3
#   RAILWAY_SERVICE_ID       the Railway service the site runs on
#   RAILWAY_PROJECT_TOKEN    a project token, which is tied to one environment
#     or RAILWAY_TOKEN       an account or workspace token
# Optional env:
#   RAILWAY_ENVIRONMENT_ID   required with RAILWAY_TOKEN; with a project token
#                            it is read from the token
#   DEPLOY_TIMEOUT           seconds to wait for the deployment (default 600)

# The GraphQL documents below use $variables that the shell must leave alone.
# shellcheck disable=SC2016

set -euo pipefail

ENDPOINT="${RAILWAY_API_URL:-https://backboard.railway.com/graphql/v2}"
DEPLOY_TIMEOUT="${DEPLOY_TIMEOUT:-600}"
POLL_SECONDS="${POLL_SECONDS:-5}"

die() {
  echo "$*" >&2
  exit 1
}

[ -n "${IMAGE:-}" ] || die "IMAGE is not set."
[ -n "${RAILWAY_SERVICE_ID:-}" ] || die "RAILWAY_SERVICE_ID is not set."

if [ -n "${RAILWAY_PROJECT_TOKEN:-}" ]; then
  AUTH=(-H "Project-Access-Token: ${RAILWAY_PROJECT_TOKEN}")
elif [ -n "${RAILWAY_TOKEN:-}" ]; then
  AUTH=(-H "Authorization: Bearer ${RAILWAY_TOKEN}")
else
  die "Set RAILWAY_PROJECT_TOKEN (project token) or RAILWAY_TOKEN (account token)."
fi

# Runs one GraphQL request and prints the response. Fails on an API error.
gql() {
  local query="$1" variables="${2:-}" payload response
  [ -n "${variables}" ] || variables='{}'
  payload="$(jq -nc --arg q "${query}" --argjson v "${variables}" '{query: $q, variables: $v}')"
  response="$(curl -sS -X POST "${ENDPOINT}" "${AUTH[@]}" -H "Content-Type: application/json" -d "${payload}")"
  if ! jq -e . >/dev/null 2>&1 <<<"${response}"; then
    die "Railway API returned something that is not JSON: ${response:0:200}"
  fi
  if jq -e '(.errors // []) | length > 0' >/dev/null <<<"${response}"; then
    echo "Railway API error:" >&2
    jq -r '.errors[].message' >&2 <<<"${response}"
    return 1
  fi
  printf '%s' "${response}"
}

if [ -z "${RAILWAY_ENVIRONMENT_ID:-}" ]; then
  [ -n "${RAILWAY_PROJECT_TOKEN:-}" ] || die "RAILWAY_ENVIRONMENT_ID is required when using RAILWAY_TOKEN."
  RAILWAY_ENVIRONMENT_ID="$(gql 'query { projectToken { environmentId } }' | jq -r '.data.projectToken.environmentId // empty')"
  [ -n "${RAILWAY_ENVIRONMENT_ID}" ] || die "Could not read the environment from the project token."
fi

target="$(jq -nc --arg environmentId "${RAILWAY_ENVIRONMENT_ID}" --arg serviceId "${RAILWAY_SERVICE_ID}" \
  '{environmentId: $environmentId, serviceId: $serviceId}')"

echo "Setting the service image to ${IMAGE}"
gql 'mutation ($environmentId: String!, $serviceId: String!, $input: ServiceInstanceUpdateInput!) {
  serviceInstanceUpdate(environmentId: $environmentId, serviceId: $serviceId, input: $input)
}' "$(jq -c --arg image "${IMAGE}" '. + {input: {source: {image: $image}}}' <<<"${target}")" >/dev/null

echo "Starting a deployment"
deployment_id="$(gql 'mutation ($environmentId: String!, $serviceId: String!) {
  serviceInstanceDeployV2(environmentId: $environmentId, serviceId: $serviceId)
}' "${target}" | jq -r '.data.serviceInstanceDeployV2 // empty')"

if [ -z "${deployment_id}" ]; then
  echo "Deployment started, but Railway returned no deployment id, so its result is not being watched."
  exit 0
fi
echo "Deployment ${deployment_id}"

deadline=$((SECONDS + DEPLOY_TIMEOUT))
last=""
while :; do
  # A failed status check is not a failed deployment, so keep polling until the deadline.
  status="$(gql 'query ($id: String!) { deployment(id: $id) { status } }' \
    "$(jq -nc --arg id "${deployment_id}" '{id: $id}')" | jq -r '.data.deployment.status // "UNKNOWN"')" || status="UNKNOWN"
  if [ "${status}" != "${last}" ]; then
    echo "  ${status}"
    last="${status}"
  fi

  case "${status}" in
    SUCCESS)
      echo "Deployed ${IMAGE}"
      exit 0
      ;;
    FAILED | CRASHED | REMOVED | REMOVING | SKIPPED)
      die "Deployment ended as ${status}. Check the service logs in Railway."
      ;;
    NEEDS_APPROVAL)
      die "Deployment is waiting for approval in Railway."
      ;;
  esac

  [ "${SECONDS}" -lt "${deadline}" ] || die "Gave up after ${DEPLOY_TIMEOUT}s with the deployment still ${status}."
  sleep "${POLL_SECONDS}"
done
