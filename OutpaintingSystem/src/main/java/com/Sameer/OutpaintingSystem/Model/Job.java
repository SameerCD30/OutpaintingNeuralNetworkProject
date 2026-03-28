package com.Sameer.OutpaintingSystem.Model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Job {

    @Id
    private String id;

    private String inputPath;
    private String outputPath;
    private String status; // pending/done
}
