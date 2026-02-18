package com.realstream.content.repository;

import com.realstream.content.model.Video;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VideoRepository extends MongoRepository<Video, String> {
    Optional<Video> findByVideoId(String videoId);
    List<Video> findByHashtagsIn(List<String> hashtags);
    Page<Video> findByHashtagsIn(List<String> hashtags, Pageable pageable);

    Page<Video> findByChannelTitle(String channelTitle, Pageable pageable);
}
