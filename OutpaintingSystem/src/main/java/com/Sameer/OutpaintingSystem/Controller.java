package com.Sameer.OutpaintingSystem;

import com.Sameer.OutpaintingSystem.service.ImageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


import java.io.IOException;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/image")
public class Controller {

    @Autowired
    private ImageService imageService;

    @PostMapping("/outpaint")
    public ResponseEntity<?> outpaintImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("aspectRatio") String aspectRatio,
            @RequestParam("mode") String mode
    ) throws IOException {

        String resultUrl = imageService.processImage(file, aspectRatio);

        return ResponseEntity.ok(Map.of(
                "resultUrl", resultUrl
        ));
    }

    @GetMapping("/health")
    public String health(){
        return "working fine";
    }
}