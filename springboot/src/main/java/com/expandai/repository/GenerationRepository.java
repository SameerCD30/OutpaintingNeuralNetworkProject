package com.expandai.repository;

import com.expandai.model.Generation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GenerationRepository extends JpaRepository<Generation, Long> {
    Page<Generation> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Optional<Generation> findByJobId(String jobId);
}
