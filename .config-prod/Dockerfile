ARG grafana_version=latest
ARG grafana_image=grafana-enterprise

FROM grafana/${grafana_image}:${grafana_version}

ARG TARGETARCH

# Make it as simple as possible to access the grafana instance for development purposes
# Do NOT enable these settings in a public facing / production grafana instance
ENV GF_AUTH_ANONYMOUS_ORG_ROLE "Admin"
ENV GF_AUTH_ANONYMOUS_ENABLED "true"
ENV GF_AUTH_BASIC_ENABLED "false"
# Set development mode so plugins can be loaded without the need to sign
ENV GF_DEFAULT_APP_MODE "development"

ENV GF_PATHS_HOME="/usr/share/grafana"
WORKDIR $GF_PATHS_HOME

USER root

ENV GF_PATHS_PLUGINS=/usr/share/grafana/plugins
ENV PLUGIN_VERSION=0.0.7

# arm64 or amd64
ENV PLUGIN_ARCH=arm64
RUN \
    grafana cli \
    --pluginUrl https://github.com/snakedotdev/grafana-duckdb-datasource/releases/download/v${PLUGIN_VERSION}/grafana-duckdb-datasource-${PLUGIN_VERSION}-${PLUGIN_ARCH}.zip \
    plugins install grafana-duckdb-datasource