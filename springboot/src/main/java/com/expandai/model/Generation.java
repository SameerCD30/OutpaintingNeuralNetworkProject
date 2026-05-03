package com.expandai.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "generations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Generation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", unique = true)
    private String jobId;

    @Column(name = "aspect_ratio", nullable = false, length = 10)
    private String aspectRatio;

    @Column(name = "direction", length = 20)
    private String direction;

    @Column(name = "result_url", length = 1000)
    private String resultUrl;

    @Column(name = "original_width")
    private Integer originalWidth;

    @Column(name = "original_height")
    private Integer originalHeight;

    @Column(name = "result_width")
    private Integer resultWidth;

    @Column(name = "result_height")
    private Integer resultHeight;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
