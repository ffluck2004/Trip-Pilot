package com.trippilot.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

public class DatabaseUrlPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String rawUrl = environment.getProperty("SPRING_DATASOURCE_URL");
        if (rawUrl == null || rawUrl.isBlank()) {
            return;
        }

        String jdbcUrl = toJdbcUrl(rawUrl);
        if (jdbcUrl == null) {
            return;
        }

        Map<String, Object> props = new HashMap<>();
        props.put("spring.datasource.url", jdbcUrl);
        environment.getPropertySources().addFirst(new MapPropertySource("renderDatabaseUrl", props));
    }

    private String toJdbcUrl(String url) {
        if (url.startsWith("jdbc:postgresql://")) {
            return url;
        }
        String noScheme = url.replaceFirst("^postgres(ql)?://", "");
        String credentialsAndHost = noScheme.split("/")[0];
        String database = noScheme.contains("/") ? noScheme.substring(noScheme.indexOf('/') + 1) : "";

        String[] credsParts = credentialsAndHost.contains("@") ? credentialsAndHost.split("@") : new String[]{credentialsAndHost};
        String hostPort = credsParts[credsParts.length - 1];

        String host = hostPort;
        String port = "5432";
        if (hostPort.contains(":")) {
            String[] hp = hostPort.split(":");
            host = hp[0];
            port = hp[1];
        }
        if (host.endsWith(":5432") || host.isEmpty()) {
            return null;
        }

        String db = database.split("\\?")[0];
        return "jdbc:postgresql://" + host + ":" + port + "/" + db;
    }
}
