package com.expandai.service;

import com.expandai.dto.GenerationDto;
import com.expandai.model.Generation;
import com.expandai.repository.GenerationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GenerationService {

    private final GenerationRepository repo;

    public GenerationDto.Response save(GenerationDto.Request req) {
        Generation g = Generation.builder()
                .jobId(req.getJobId())
                .aspectRatio(req.getAspectRatio())
                .direction(req.getDirection())
                .resultUrl(req.getResultUrl())
                .originalWidth(req.getOriginalWidth())
                .originalHeight(req.getOriginalHeight())
                .resultWidth(req.getResultWidth())
                .resultHeight(req.getResultHeight())
                .build();
        return toResponse(repo.save(g));
    }

    public Page<GenerationDto.Response> getAll(int page, int size) {
        return repo.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                   .map(this::toResponse);
    }

    public GenerationDto.Response getById(Long id) {
        return repo.findById(id)
                   .map(this::toResponse)
                   .orElseThrow(() -> new RuntimeException("Generation not found: " + id));
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) throw new RuntimeException("Generation not found: " + id);
        repo.deleteById(id);
    }

    private GenerationDto.Response toResponse(Generation g) {
        return GenerationDto.Response.builder()
                .id(g.getId())
                .jobId(g.getJobId())
                .aspectRatio(g.getAspectRatio())
                .direction(g.getDirection())
                .resultUrl(g.getResultUrl())
                .originalWidth(g.getOriginalWidth())
                .originalHeight(g.getOriginalHeight())
                .resultWidth(g.getResultWidth())
                .resultHeight(g.getResultHeight())
                .createdAt(g.getCreatedAt())
                .build();
    }
}
