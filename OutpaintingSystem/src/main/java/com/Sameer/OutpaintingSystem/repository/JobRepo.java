package com.Sameer.OutpaintingSystem.repository;

import com.Sameer.OutpaintingSystem.Model.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JobRepo extends JpaRepository<Job, String> {


}
