FROM grafana/grafana:13.3.0

# RoboShop uses Grafana's built-in Prometheus datasource only.
# Remove unused bundled datasource plugins whose Go binaries carry
# fixable HIGH/CRITICAL vulnerabilities; this reduces attack surface.
USER root
RUN rm -rf \
    /usr/share/grafana/data/plugins-bundled/cloudwatch \
    /usr/share/grafana/data/plugins-bundled/grafana-postgresql-datasource \
    /usr/share/grafana/data/plugins-bundled/grafana-pyroscope-datasource \
    /usr/share/grafana/data/plugins-bundled/influxdb \
    /usr/share/grafana/data/plugins-bundled/jaeger \
    /usr/share/grafana/data/plugins-bundled/loki \
    /usr/share/grafana/data/plugins-bundled/mssql \
    /usr/share/grafana/data/plugins-bundled/mysql \
    /usr/share/grafana/data/plugins-bundled/opentsdb \
    /usr/share/grafana/data/plugins-bundled/tempo
USER grafana
