package com.Sameer.OutpaintingSystem.service;

import com.Sameer.OutpaintingSystem.Model.Job;
import com.Sameer.OutpaintingSystem.repository.JobRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class JobService {

    @Autowired
    private static JobRepo repo;

    public static void saveJob(Job job) {
        repo.saveJob(job);
    }

    public Job findById(String id) {
        return repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Job not found"));
    }
}
