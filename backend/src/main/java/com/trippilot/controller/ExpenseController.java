package com.trippilot.controller;

import com.trippilot.dto.request.CreateExpenseRequest;
import com.trippilot.entity.Expense;
import com.trippilot.service.ExpenseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) { this.expenseService = expenseService; }

    @GetMapping("/trip/{tripId}")
    public ResponseEntity<List<Expense>> getExpenses(@PathVariable String tripId) {
        return ResponseEntity.ok(expenseService.getExpensesByTrip(tripId));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createExpense(@RequestBody CreateExpenseRequest req) {
        Expense expense = expenseService.createExpense(
            req.getTripId(), req.getAmount(), req.getCategory(), req.getDescription(), req.getDate());
        return ResponseEntity.ok(Map.of("success", true, "expense", expense));
    }
}
