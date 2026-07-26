package com.trippilot.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterRequest {
    @NotBlank @Email
    private String email;
    @NotBlank @Size(min = 3)
    private String password;
    @NotBlank
    private String name;
    private String preferencesStyles;
    private String preferencesInterests;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPreferencesStyles() { return preferencesStyles; }
    public void setPreferencesStyles(String s) { this.preferencesStyles = s; }
    public String getPreferencesInterests() { return preferencesInterests; }
    public void setPreferencesInterests(String i) { this.preferencesInterests = i; }
}
