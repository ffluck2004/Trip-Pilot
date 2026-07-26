package com.trippilot.service;

import com.trippilot.entity.Expense;
import com.trippilot.entity.Trip;
import com.trippilot.exception.ResourceNotFoundException;
import com.trippilot.repository.ExpenseRepository;
import com.trippilot.repository.TripRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepo;
    private final TripRepository tripRepo;

    public ExpenseService(ExpenseRepository expenseRepo, TripRepository tripRepo) {
        this.expenseRepo = expenseRepo;
        this.tripRepo = tripRepo;
    }

    public List<Expense> getExpensesByTrip(String tripId) {
        return expenseRepo.findByTripId(tripId);
    }

    public Expense createExpense(String tripId, BigDecimal amount, String category, String description, String date) {
        Expense expense = new Expense();
        expense.setId("exp-" + UUID.randomUUID().toString().substring(0, 8));
        expense.setTripId(tripId);
        expense.setAmount(amount);
        expense.setCategory(category);
        expense.setDescription(description);
        if (date != null && !date.isBlank()) {
            expense.setExpenseDate(LocalDate.parse(date));
        } else {
            expense.setExpenseDate(LocalDate.now());
        }
        expenseRepo.save(expense);

        // Update trip actual spending
        tripRepo.findById(tripId).ifPresent(trip -> {
            trip.setActualSpending(trip.getActualSpending().add(amount));
            tripRepo.save(trip);
        });

        return expense;
    }
}
