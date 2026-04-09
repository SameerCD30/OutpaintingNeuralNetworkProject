package com.Sameer.OutpaintingSystem.service;

import com.Sameer.OutpaintingSystem.Model.Job;
import com.Sameer.OutpaintingSystem.repository.JobRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;


@Service
public class ImageService {

    @Autowired
    private MLService mlService;

    public String processImage(MultipartFile file, String aspectRatio) throws IOException {

        File tempFile = File.createTempFile("upload", ".jpg");
        file.transferTo(tempFile);

        int expandPixels = calculateExpansion(aspectRatio);

        return mlService.callMLService(tempFile, expandPixels);
    }

    private int calculateExpansion(String aspectRatio) {
        return switch (aspectRatio) {
            case "16:9" -> 256;
            case "4:3" -> 128;
            default -> 256;
        };
    }
}