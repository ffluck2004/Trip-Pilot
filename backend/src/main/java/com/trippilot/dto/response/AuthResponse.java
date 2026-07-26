package com.trippilot.dto.response;

import java.util.Map;

public class AuthResponse {
    private boolean success;
    private Map<String, Object> user;
    private String token;
    private String error;

    public static AuthResponse ok(Map<String, Object> user, String token) {
        AuthResponse r = new AuthResponse();
        r.success = true;
        r.user = user;
        r.token = token;
        return r;
    }

    public static AuthResponse fail(String error) {
        AuthResponse r = new AuthResponse();
        r.success = false;
        r.error = error;
        return r;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public Map<String, Object> getUser() { return user; }
    public void setUser(Map<String, Object> user) { this.user = user; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}
