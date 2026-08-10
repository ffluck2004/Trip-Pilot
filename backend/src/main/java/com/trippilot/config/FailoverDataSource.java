package com.trippilot.config;

import org.flywaydb.core.Flyway;
import org.springframework.jdbc.datasource.AbstractDataSource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

public class FailoverDataSource extends AbstractDataSource {

    private static final long COOLDOWN_MS = 60_000L;

    private final DataSource primary;
    private final DataSource h2;
    private volatile boolean useH2 = false;
    private volatile long h2Until = 0L;
    private volatile boolean h2Ready = false;

    public FailoverDataSource(DataSource primary, DataSource h2) {
        this.primary = primary;
        this.h2 = h2;
    }

    /** Name of the database currently serving requests: "postgres" or "h2". */
    public String activeMode() {
        return useH2 ? "h2" : "postgres";
    }

    public boolean usingFallback() {
        return useH2;
    }

    @Override
    public Connection getConnection() throws SQLException {
        if (useH2) {
            if (System.currentTimeMillis() > h2Until) {
                try {
                    Connection recovered = primary.getConnection();
                    useH2 = false;
                    return recovered;
                } catch (SQLException ignore) {
                    h2Until = System.currentTimeMillis() + COOLDOWN_MS;
                }
            }
            ensureH2Ready();
            return h2.getConnection();
        }

        try {
            return primary.getConnection();
        } catch (SQLException e) {
            useH2 = true;
            h2Until = System.currentTimeMillis() + COOLDOWN_MS;
            ensureH2Ready();
            return h2.getConnection();
        }
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        return getConnection();
    }

    private void ensureH2Ready() throws SQLException {
        if (h2Ready) return;
        synchronized (this) {
            if (h2Ready) return;
            try {
                Flyway.configure()
                        .dataSource(h2)
                        .locations("classpath:db/h2migration")
                        .baselineOnMigrate(true)
                        .load()
                        .migrate();
                h2Ready = true;
                System.out.println("Embedded H2 fallback database initialized and migrated.");
            } catch (Exception e) {
                throw new SQLException("H2 fallback init failed: " + e.getMessage(), e);
            }
        }
    }
}
