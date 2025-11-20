package org.Project.ServiceImpl;

import com.google.gson.Gson;
import org.Project.Entity.Sessions;
import org.Project.Repository.SessionRepository;
import org.Project.Service.SessionService;
import org.Project.dto.SessionDto;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class SessionServiceImpl implements SessionService {

    @Autowired
    private SessionRepository sessionRepository;

    private static final Logger logger = LogManager.getLogger(SessionServiceImpl.class);
    private static final SecureRandom random = new SecureRandom();
    private static final int DEFAULT_TTL_MINUTES = 60 * 24; // 1440
    private final String className = "SessionServiceImpl";

    public String generateSessionToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    @Override
    public ResponseEntity<?> createSession(SessionDto sessionDto) {
        String methodName = "createSession";
        logger.info("{} {} for userName: {} userId: {}", className, methodName, sessionDto.getUserName(), sessionDto.getUserId());
        try {
            Gson gson = new Gson();
            if (sessionDto.getUserName() == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "INVALID_PAYLOAD", "message", "Invalid UserName or UserId"));
            }
            List<Sessions> existing = sessionRepository.findAllByUserNameAndActiveFlag(sessionDto.getUserName(), true);
            if (!existing.isEmpty()) {
                for (Sessions s : existing) {
                    s.setActiveFlag(false);
                    s.setStatus(Sessions.SessionStatus.REVOKED);
                    s.setRevokedBy("SYSTEM");
                    s.setRevokedAt(LocalDateTime.now());
                }
                sessionRepository.saveAll(existing);
            }
            Sessions createSession = new Sessions();
            createSession.setUserId(sessionDto.getUserId());
            createSession.setCreatedBy(sessionDto.getUserName());
            createSession.setUserName(sessionDto.getUserName());
            createSession.setCreatedDate(LocalDateTime.now());
            createSession.setStatus(Sessions.SessionStatus.ACTIVE);
            createSession.setActiveFlag(true);
            String sessionToken = generateSessionToken();
            createSession.setSessionToken(sessionToken);
            int ttl = (sessionDto.getTtlMinutes() == null || sessionDto.getTtlMinutes() <= 0) ? DEFAULT_TTL_MINUTES : sessionDto.getTtlMinutes();
            createSession.setExpiresAt(LocalDateTime.now().plusMinutes(ttl));
            createSession.setRoleName(sessionDto.getRoleName() == null ? Collections.emptyList() : sessionDto.getRoleName());
            createSession.setMetaData(gson.toJson(sessionDto.getMetaData()));
            createSession.setIpAddress(sessionDto.getIpAddress());
            createSession.setUserAgent(sessionDto.getUserAgent());
            createSession.setLastSeenAt(LocalDateTime.now());

            Sessions savedSession = sessionRepository.save(createSession);
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("sessionId", savedSession.getSessionId());
            resp.put("sessionToken", savedSession.getSessionToken());
            resp.put("createdDate", savedSession.getCreatedDate());
            resp.put("expiresAt", savedSession.getExpiresAt());
            resp.put("userId", savedSession.getUserId());
            resp.put("userName", savedSession.getUserName());
            resp.put("roles", savedSession.getRoleName());
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e.toString(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "INTERNAL_ERROR", "message", "Failed to Create Session"));
        }
    }

    @Override
    public ResponseEntity<?> validateSessionByToken(String sessionToken) {
        String methodName = "validateSessionByToken";
        logger.info("{} {} token: {}", className, methodName, sessionToken == null ? "null" : "[REDACTED]");
        try {
            if (sessionToken == null || sessionToken.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "UNAUTHORIZED", "message", "Missing token"));
            }
            Optional<Sessions> getSession = sessionRepository.findBySessionTokenAndActiveFlag(sessionToken, true);
            if (getSession.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("valid", false, "reason", "INVALID_OR_REVOKED"));
            }
            Sessions session = getSession.get();
            if (session.getExpiresAt() != null && session.getExpiresAt().isBefore(LocalDateTime.now())) {
                session.setStatus(Sessions.SessionStatus.EXPIRED);
                session.setActiveFlag(false);
                sessionRepository.save(session);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("valid", false, "reason", "EXPIRED", "expiresAt", session.getExpiresAt()));
            }
            session.setLastSeenAt(LocalDateTime.now());
            sessionRepository.save(session);
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("valid", true);
            map.put("sessionId", session.getSessionId());
            map.put("userId", session.getUserId());
            map.put("userName", session.getUserName());
            map.put("roles", session.getRoleName());
            map.put("status", session.getStatus());
            map.put("createdDate", session.getCreatedDate());
            map.put("lastSeenAt", session.getLastSeenAt());
            map.put("expiresAt", session.getExpiresAt());
            map.put("ipAddress", session.getIpAddress());
            map.put("userAgent", session.getUserAgent());
            return ResponseEntity.ok(map);
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e.toString(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "INTERNAL_ERROR", "message", "Failed to Validate Session"));
        }
    }
    @Override
    public ResponseEntity<?> validateSessionById(Integer sessionId) {
        String methodName = "validateSessionById";
        logger.info("{} {} sessionId : {}", className, methodName, sessionId);
        try {
            if (sessionId == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "INVALID_PAYLOAD", "message", "sessionId required"));
            }
            Optional<Sessions> getSession = sessionRepository.findBySessionIdAndActiveFlag(sessionId, true);
            if (getSession.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("valid", false, "message", "Invalid session"));
            }
            Sessions session = getSession.get();
            if (session.getExpiresAt() != null && session.getExpiresAt().isBefore(LocalDateTime.now())) {
                session.setStatus(Sessions.SessionStatus.EXPIRED);
                session.setActiveFlag(false);
                sessionRepository.save(session);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("valid", false, "reason", "EXPIRED", "expiresAt", session.getExpiresAt()));
            }
            session.setLastSeenAt(LocalDateTime.now());
            sessionRepository.save(session);
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("valid", true);
            map.put("sessionId", session.getSessionId());
            map.put("sessionToken", session.getSessionToken());
            map.put("userId", session.getUserId());
            map.put("userName", session.getUserName());
            map.put("roles", session.getRoleName());
            map.put("status", session.getStatus());
            map.put("createdDate", session.getCreatedDate());
            map.put("lastSeenAt", session.getLastSeenAt());
            map.put("expiresAt", session.getExpiresAt());
            map.put("ipAddress", session.getIpAddress());
            map.put("userAgent", session.getUserAgent());
            return ResponseEntity.ok(map);
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e.toString(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "INTERNAL_ERROR", "message", "Failed to Validate Session"));
        }
    }

    @Override
    public ResponseEntity<?> refreshSession(String sessionToken, Integer ttlMinutes) {
        String methodName = "refreshSession";
        logger.info("{} {} token: {} ttlMinutes : {}", className, methodName, sessionToken == null ? "null" : "[REDACTED]", ttlMinutes);
        try {
            if (sessionToken == null || sessionToken.isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "INVALID_PAYLOAD", "message", "token required"));
            }
            Optional<Sessions> getSession = sessionRepository.findBySessionTokenAndActiveFlag(sessionToken, true);
            if (getSession.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "CANNOT_REFRESH", "message", "Session is revoked or expired"));
            }
            Sessions refreshSession = getSession.get();

            int ttl = (ttlMinutes == null || ttlMinutes <= 0) ? DEFAULT_TTL_MINUTES : ttlMinutes;
            refreshSession.setExpiresAt(LocalDateTime.now().plusMinutes(ttl));
            refreshSession.setLastSeenAt(LocalDateTime.now());
            Sessions updatedSession = sessionRepository.save(refreshSession);

            Map<String, Object> resp = Map.of(
                    "sessionId", updatedSession.getSessionId(),
                    "sessionToken", updatedSession.getSessionToken(),
                    "expiresAt", updatedSession.getExpiresAt()
            );
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e.toString(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "INTERNAL_ERROR", "message", "Failed to Refresh Session"));
        }
    }

    @Override
    public ResponseEntity<?> revokeSession(String sessionToken, Integer sessionId, String revokedBy) {
        String methodName = "revokeSession";
        logger.info("{} {} token: {} sessionId: {} by: {}", className, methodName,
                sessionToken == null ? "null" : "[REDACTED]", sessionId, revokedBy);
        try {
            Sessions revoke = null;
            if (sessionToken != null && !sessionToken.isBlank()) {
                revoke = sessionRepository.findBySessionTokenAndActiveFlag(sessionToken, true).orElse(null);
            } else if (sessionId != null) {
                revoke = sessionRepository.findBySessionIdAndActiveFlag(sessionId, true).orElse(null);
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "INVALID_PAYLOAD", "message", "token or sessionId required"));
            }
            if (revoke == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "NOT_FOUND", "message", "Session Not Found"));
            }
            revoke.setActiveFlag(false);
            revoke.setRevokedAt(LocalDateTime.now());
            revoke.setRevokedBy(revokedBy == null ? "SYSTEM" : revokedBy);
            revoke.setLastSeenAt(LocalDateTime.now());
            revoke.setStatus(Sessions.SessionStatus.REVOKED);
            Sessions updatedSession = sessionRepository.save(revoke);

            Map<String, Object> map = new LinkedHashMap<>();
            map.put("success", true);
            map.put("sessionId", updatedSession.getSessionId());
            map.put("revokedAt", updatedSession.getRevokedAt());
            return ResponseEntity.ok(map);
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e.toString(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "INTERNAL_ERROR", "message", "Failed to Revoke Session"));
        }
    }

    @Override
    public ResponseEntity<?> revokeAllSession(Integer userId, String userName, String revokedBy) {
        String methodName = "revokeAllSession";
        logger.info("{} {} userId : {} userName : {}  revokedBy : {}", className, methodName, userId, userName, revokedBy);
        try {
            if (userId == null || userName == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "INVALID_PAYLOAD", "message", "UserId or UserName is Required"));
            }
            Integer revokedCount = sessionRepository.revokeAllByUserId(userId, LocalDateTime.now(), revokedBy == null ? "SYSTEM" : revokedBy, Sessions.SessionStatus.REVOKED);
            Map<String, Object> map = new HashMap<>();
            map.put("revoked", revokedCount);
            map.put("revokedAt", LocalDateTime.now());
            map.put("userId", userId);
            map.put("userName", userName);
            return ResponseEntity.ok(map);
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e.toString(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "INTERNAL_ERROR", "message", "Failed to Revoke All Session"));
        }
    }

    @Override
    public ResponseEntity<?> sessionList(Integer userId, String userName, String statusStr, Boolean activeFlag, Integer page, Integer size) {
        String methodName = "sessionList";
        logger.info("{} {} userId : {} userName : {}  statusStr : {} activeFlag : {} page : {} size : {} ",
                className, methodName, userId, userName, statusStr, activeFlag, page, size);
        try {
            int intPage = (page == null || page < 0) ? 0 : page;
            int intSize = (size == null || size <= 0) ? 20 : size;
            Pageable pageable = PageRequest.of(intPage, intSize, Sort.by(Sort.Direction.DESC, "createdDate"));
            Sessions.SessionStatus status = null;
            if (statusStr != null && !statusStr.isBlank()) {
                try {
                    status = Sessions.SessionStatus.valueOf(statusStr.trim().toUpperCase());
                } catch (IllegalArgumentException ex) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(Map.of("error", "INVALID_FILTER", "message", "status must be one of ACTIVE,EXPIRED,REVOKED,INACTIVE"));
                }
            }
            Page<Sessions> pageData = sessionRepository.findByFilters(userId, userName, status, activeFlag, pageable);
            List<Map<String, Object>> contentList = new ArrayList<>();
            for (Sessions sObj : pageData.getContent()) {
                Map<String, Object> sessionMap = new HashMap<>();
                sessionMap.put("sessionId", sObj.getSessionId());
                sessionMap.put("userId", sObj.getUserId());
                sessionMap.put("userName", sObj.getUserName());
                sessionMap.put("roles", sObj.getRoleName());
                sessionMap.put("status", sObj.getStatus() != null ? sObj.getStatus().name() : null);
                sessionMap.put("createdDate", sObj.getCreatedDate());
                sessionMap.put("lastSeenAt", sObj.getLastSeenAt());
                sessionMap.put("expiresAt", sObj.getExpiresAt());
                sessionMap.put("ipAddress", sObj.getIpAddress());
                sessionMap.put("activeFlag", sObj.getActiveFlag());
                contentList.add(sessionMap);
            }
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("page", pageData.getNumber());
            response.put("size", pageData.getSize());
            response.put("totalElements", pageData.getTotalElements());
            response.put("totalPages", pageData.getTotalPages());
            response.put("sort", "createdDate,desc");
            response.put("content", contentList);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e.toString(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "INTERNAL_ERROR", "message", "Failed to Fetch List Session"));
        }
    }
    @Override
    public ResponseEntity<?> cleanUpSession(Integer olderThanDays) {
        String methodName = "cleanUpSession";
        logger.info("{} {} olderThanDays : {} ", className, methodName, olderThanDays);
        try {
            if (olderThanDays == null || olderThanDays < 0) olderThanDays = 30;
            Integer deletedSession = sessionRepository.deleteExpired(LocalDateTime.now().minusDays(olderThanDays));
            return ResponseEntity.ok(Map.of("deleted", deletedSession, "thresholdDate", LocalDateTime.now().minusDays(olderThanDays)));
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e.toString(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "INTERNAL_ERROR", "message", "Failed to CleanUp Session"));
        }
    }

    @Override
    public ResponseEntity<?> extendSession(String sessionToken, Integer additionalMinutes) {
        String methodName = "extendSession";
        logger.info("{} {} token: {} additionalMinutes : {} ", className, methodName, sessionToken == null ? "null" : "[REDACTED]", additionalMinutes);
        try {
            if (sessionToken == null || sessionToken.isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "INVALID_PAYLOAD", "message", "token required"));
            }
            if (additionalMinutes == null || additionalMinutes <= 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "INVALID_PAYLOAD", "message", "additionalMinutes must be > 0"));
            }
            Optional<Sessions> getSession = sessionRepository.findBySessionTokenAndActiveFlag(sessionToken, true);
            if (getSession.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "NOT_ACTIVE", "message", "Session is revoked or expired and cannot be extended"));
            }
            Sessions extendSession = getSession.get();
            extendSession.setExpiresAt(LocalDateTime.now().plusMinutes(additionalMinutes));
            extendSession.setLastSeenAt(LocalDateTime.now());
            Sessions updatedSession = sessionRepository.save(extendSession);
            return ResponseEntity.ok(Map.of("sessionId", updatedSession.getSessionId(), "sessionToken", updatedSession.getSessionToken(), "expiresAt", updatedSession.getExpiresAt()));
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e.toString(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "INTERNAL_ERROR", "message", "Failed to Extend Session"));
        }
    }

    @Override
    public ResponseEntity<?> getSessionById(Integer sessionId, Authentication authentication) {
        String methodName = "getSessionById";
        logger.info("{} {} sessionId : {} authentication : {} ", className, methodName, sessionId, authentication == null ? "null" : authentication.getName());
        try {
            Sessions getSession = sessionRepository.findById(sessionId).orElseThrow(() -> new NoSuchElementException("Session not found"));

            boolean isAdmin = authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equalsIgnoreCase("ROLE_ADMIN") || a.getAuthority().equalsIgnoreCase("ADMIN"));
            boolean isOwner = authentication != null && authentication.getName().equalsIgnoreCase(getSession.getUserName());

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("sessionId", getSession.getSessionId());
            result.put("sessionToken", (isAdmin || isOwner) ? getSession.getSessionToken() : "************");
            result.put("userId", getSession.getUserId());
            result.put("userName", getSession.getUserName());
            result.put("roles", getSession.getRoleName());
            result.put("status", getSession.getStatus() != null ? getSession.getStatus().name() : null);
            result.put("createdDate", getSession.getCreatedDate());
            result.put("expiresAt", getSession.getExpiresAt());
            result.put("activeFlag", getSession.getActiveFlag());
            if (isAdmin || isOwner) {
                result.put("ipAddress", getSession.getIpAddress());
                result.put("userAgent", getSession.getUserAgent());
                result.put("createdBy", getSession.getCreatedBy());
                result.put("lastSeenAt", getSession.getLastSeenAt());
                result.put("revokedAt", getSession.getRevokedAt());
                result.put("revokedBy", getSession.getRevokedBy());
                result.put("metaData", getSession.getMetaData());
            }
            return ResponseEntity.ok(result);
        } catch (NoSuchElementException ne) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "NOT_FOUND", "message", ne.getMessage()));
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e.toString(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "INTERNAL_ERROR", "message", "Failed to Fetch Session"));
        }
    }
}