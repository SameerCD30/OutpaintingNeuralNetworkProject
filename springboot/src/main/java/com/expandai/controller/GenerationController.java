package com.expandai.controller;

import com.expandai.dto.GenerationDto;
import com.expandai.service.GenerationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/generations")
@RequiredArgsConstructor
public class GenerationController {

    private final GenerationService service;

    // POST /api/generations — save a new generation
    @PostMapping
    public ResponseEntity<GenerationDto.Response> create(@Valid @RequestBody GenerationDto.Request req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.save(req));
    }

    // GET /api/generations?page=0&size=20 — paginated list, newest first
    @GetMapping
    public ResponseEntity<Page<GenerationDto.Response>> getAll(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.getAll(page, size));
    }

    // GET /api/generations/{id}
    @GetMapping("/{id}")
    public ResponseEntity<GenerationDto.Response> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    // DELETE /api/generations/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
