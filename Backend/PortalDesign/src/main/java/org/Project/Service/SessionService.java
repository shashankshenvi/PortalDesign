package org.Project.Service;

import org.Project.dto.SessionDto;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

public interface SessionService {
    ResponseEntity<?> createSession(SessionDto sessionDto);

    ResponseEntity<?> validateSessionByToken(String sessionToken);

    ResponseEntity<?> refreshSession(String sessionToken, Integer ttlMinutes);

    ResponseEntity<?> revokeSession(String sessionToken, Integer sessionId, String revokedBy);

    ResponseEntity<?> revokeAllSession(Integer userId, String userName, String revokedBy);

    ResponseEntity<?> sessionList(Integer userId, String userName, String status, Boolean activeFlag, Integer page, Integer size);

    ResponseEntity<?> cleanUpSession(Integer olderThanDays);

    ResponseEntity<?> extendSession(String sessionToken, Integer additionalMinutes);

    ResponseEntity<?> getSessionById(Integer sessionId, Authentication authentication);

    ResponseEntity<?> validateSessionById(Integer sessionId);
}
