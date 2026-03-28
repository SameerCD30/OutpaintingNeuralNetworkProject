package com.Sameer.OutpaintingSystem.service;

import com.Sameer.OutpaintingSystem.Model.Job;
import com.Sameer.OutpaintingSystem.repository.JobRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class JobService {

    @Autowired
    private JobRepo repo;

    public void saveJob(Job job) {
        repo.save(job);
    }

    public Job findById(String id) {
        return repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Job not found"));
    }
}
