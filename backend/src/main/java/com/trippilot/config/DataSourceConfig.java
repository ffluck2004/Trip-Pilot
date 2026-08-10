package com.trippilot.config;

import com.zaxxer.hikari.HikariDataSource;
import org.flywaydb.core.Flyway;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource primaryDataSource(Environment env) {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(env.getProperty("spring.datasource.url", "jdbc:postgresql://localhost:5431/trippilot"));
        ds.setUsername(env.getProperty("spring.datasource.username", "trippilot"));
        ds.setPassword(env.getProperty("spring.datasource.password", "trippilot"));
        ds.setDriverClassName(env.getProperty("spring.datasource.driver-class-name", "org.postgresql.Driver"));
        ds.setMaximumPoolSize(5);
        ds.setMinimumIdle(0);
        ds.setConnectionTimeout(4000);
        ds.setInitializationFailTimeout(-1);
        return ds;
    }

    @Bean
    public DataSource h2DataSource(Environment env) {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(env.getProperty(
                "app.fallback-datasource.url",
                "jdbc:h2:mem:trippilot;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"));
        ds.setUsername(env.getProperty("app.fallback-datasource.username", "sa"));
        ds.setPassword(env.getProperty("app.fallback-datasource.password", ""));
        ds.setMaximumPoolSize(5);
        ds.setMinimumIdle(0);
        ds.setConnectionTimeout(4000);
        ds.setInitializationFailTimeout(1000);
        return ds;
    }

    @Bean
    @org.springframework.context.annotation.Primary
    public DataSource dataSource(DataSource primaryDataSource, DataSource h2DataSource) {
        return new FailoverDataSource(primaryDataSource, h2DataSource);
    }

    @Bean
    public ApplicationRunner flywayBootstrapper(DataSource primaryDataSource, DataSource h2DataSource) {
        return args -> {
            try (java.sql.Connection c = primaryDataSource.getConnection()) {
                Flyway.configure()
                        .dataSource(primaryDataSource)
                        .locations("classpath:db/migration")
                        .baselineOnMigrate(true)
                        .load()
                        .migrate();
                System.out.println("Flyway: primary PostgreSQL schema is up to date.");
            } catch (Exception e) {
                System.out.println("Primary DB unreachable at boot, preparing embedded H2 fallback: " + e.getMessage());
                try {
                    Flyway.configure()
                            .dataSource(h2DataSource)
                            .locations("classpath:db/h2migration")
                            .baselineOnMigrate(true)
                            .load()
                            .migrate();
                    System.out.println("Flyway: embedded H2 fallback schema is up to date.");
                } catch (Exception h2e) {
                    System.err.println("Both databases unavailable during migration: " + h2e.getMessage());
                }
            }
        };
    }
}
