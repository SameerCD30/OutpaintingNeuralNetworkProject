package com.expandai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;

public class GenerationDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        private String jobId;

        @NotBlank(message = "aspectRatio is required")
        private String aspectRatio;

        private String direction;
        private String resultUrl;
        private Integer originalWidth;
        private Integer originalHeight;
        private Integer resultWidth;
        private Integer resultHeight;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String jobId;
        private String aspectRatio;
        private String direction;
        private String resultUrl;
        private Integer originalWidth;
        private Integer originalHeight;
        private Integer resultWidth;
        private Integer resultHeight;
        private LocalDateTime createdAt;
    }
}
