package com.Sameer.OutpaintingSystem;

import com.Sameer.OutpaintingSystem.Model.Job;
import com.Sameer.OutpaintingSystem.service.JobService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class Controller {

    @Autowired
    private JobService service;

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam MultipartFile file) throws Exception {

        String jobId = UUID.randomUUID().toString();

        String baseDir = System.getProperty("user.dir");

        File dir = new File(baseDir + "/uploads/input/");
        if (!dir.exists()) {
            dir.mkdirs();
        }

        String path = baseDir + "/uploads/input/" + jobId + ".png";

        file.transferTo(new File(path));

        Job job = new Job(jobId, path, null, "PENDING");
        service.saveJob(job);

        redisTemplate.opsForList().rightPush("queue", jobId);

        return ResponseEntity.ok(Map.of("jobId", jobId));
    }

    @GetMapping("/job/{id}")
    public Job getJob(@PathVariable String id) {
        return service.findById(id);
    }
}