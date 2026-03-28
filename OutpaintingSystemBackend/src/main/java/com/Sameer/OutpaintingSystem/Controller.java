package com.Sameer.OutpaintingSystem;

import com.Sameer.OutpaintingSystem.Model.Job;
import com.Sameer.OutpaintingSystem.service.JobService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.Map;
import java.util.UUID;

public class Controller {

    @Autowired
    JobService service;

    @GetMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam MultipartFile file) throws Exception{
        String jobId = UUID.randomUUID().toString();

        String path = "uploads/input" + jobId + ".png";
        file.transferTo(new File(path));

        Job job = new Job(jobId, path, null, "pending");
        JobService.saveJob(job);

        redisTemplate.opsforList().rightPush("queue", jobId);

        return ResponseEntity.ok(Map.of("jobId",  jobId));
    }

    @GetMapping("/job/{id}")
    public Job getJob(@PathVariable String id) {
        return service.findById(id);

    }
}
