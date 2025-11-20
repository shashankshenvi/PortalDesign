package org.Project.Repository;

import org.Project.Entity.Sessions;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Sessions, Integer> {

    Optional<Sessions> findByUserNameAndActiveFlag(String userName, Boolean activeFlag);

    List<Sessions> findAllByUserNameAndActiveFlag(String userName, Boolean activeFlag);

    Optional<Sessions> findBySessionTokenAndActiveFlag(String sessionToken, Boolean activeFlag);

    Optional<Sessions> findBySessionIdAndActiveFlag(Integer sessionId, Boolean activeFlag);

    List<Sessions> findByUserIdAndActiveFlagTrue(Integer userId);

    @Modifying
    @Transactional
    @Query("update Sessions s set s.activeFlag = false, s.revokedAt = :revokedAt, s.revokedBy = :revokedBy, s.status = :status where s.sessionId = :sessionId")
    Integer revokeById(@Param("sessionId") Integer sessionId, @Param("revokedAt") LocalDateTime revokedAt, @Param("revokedBy") String revokedBy, @Param("status") Sessions.SessionStatus status);


    @Modifying
    @Transactional
    @Query("update Sessions s set s.activeFlag = false, s.revokedAt = :revokedAt, s.revokedBy = :revokedBy, s.status = :status where s.userId = :userId and s.activeFlag = true")
    Integer revokeAllByUserId(@Param("userId") Integer userId, @Param("revokedAt") LocalDateTime revokedAt, @Param("revokedBy") String revokedBy, @Param("status") Sessions.SessionStatus status);

    @Modifying
    @Transactional
    @Query("delete from Sessions s where s.expiresAt < :before and (s.activeFlag = false or s.status = 'EXPIRED')")
    Integer deleteExpired(@Param("before") LocalDateTime before);

    @Query("select s from Sessions s where (:userId is null or s.userId = :userId) and (:userName is null or s.userName = :userName) and (:status is null or s.status = :status) and (:activeFlag is null or s.activeFlag = :activeFlag)")
    Page<Sessions> findByFilters(@Param("userId") Integer userId, @Param("userName") String userName, @Param("status") Sessions.SessionStatus status, @Param("activeFlag") Boolean activeFlag, Pageable pageable);

    Page<Sessions> findByUserIdAndUserNameAndStatusAndActiveFlag(Integer userId, String userName, Sessions.SessionStatus status, Boolean activeFlag, Pageable pageable);
}