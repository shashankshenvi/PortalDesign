package org.Project.Controller;


import org.Project.Service.SessionService;
import org.Project.dto.SessionDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/session/")
public class SessionController {

    @Autowired
    SessionService sessionService;

    @PostMapping("create-session")
    public ResponseEntity<?> createSession(@RequestBody SessionDto sessionDto) {
        return sessionService.createSession(sessionDto);
    }

    @PostMapping("validate-session-token")
    public ResponseEntity<?> validateSessionByToken(@RequestBody Map<String, Object> requestData) {
        String sessionToken = (String) requestData.get("sessionToken");
        return sessionService.validateSessionByToken(sessionToken);
    }

    @PostMapping("validate-session-id")
    public ResponseEntity<?> validateSessionById(@RequestBody Map<String, Object> requestData) {
        Integer sessionId = (Integer) requestData.get("sessionId");
        return sessionService.validateSessionById(sessionId);
    }

    @PostMapping("refresh-session")
    public ResponseEntity<?> refreshSession(@RequestBody Map<String, Object> requestData) {
        String sessionToken = (String) requestData.get("sessionToken");
        Integer ttlMinutes = (Integer) requestData.get("ttlMinutes");
        return sessionService.refreshSession(sessionToken,ttlMinutes);
    }

    @PostMapping("revoke-session")
    public ResponseEntity<?> revokeSession(@RequestBody Map<String, Object> requestData) {
        String sessionToken = (String) requestData.get("sessionToken");
        String revokedBy = (String) requestData.get("revokedBy");
        Integer sessionId = (Integer) requestData.get("sessionId");
        return sessionService.revokeSession(sessionToken,sessionId,revokedBy);
    }

    @PostMapping("revoke-all-session")
    public ResponseEntity<?> revokeAllSession(@RequestBody Map<String, Object> requestData) {
        Integer userId = (Integer) requestData.get("userId");
        String userName = (String) requestData.get("userName");
        String revokedBy = (String) requestData.get("revokedBy");
        return sessionService.revokeAllSession(userId,userName,revokedBy);
    }

    @PostMapping("session-list")
    public ResponseEntity<?> sessionList(@RequestBody Map<String, Object> requestData) {
        Integer userId = (Integer) requestData.get("userId");
        String userName = (String) requestData.get("userName");
        String status = (String) requestData.get("status");
        Boolean activeFlag = (Boolean) requestData.get("activeFlag");
        Integer page = (Integer) requestData.get("page");
        Integer size = (Integer) requestData.get("size");
         return sessionService.sessionList(userId,userName,status,activeFlag,page,size);
    }

    @DeleteMapping("cleanup-session")
    public ResponseEntity<?> cleanUpSession(@RequestBody Map<String, Object> requestData) {
        Integer olderThanDays = (Integer) requestData.get("olderThanDays");
        return sessionService.cleanUpSession(olderThanDays);
    }

    @PostMapping("extend-session")
    public ResponseEntity<?> extendSession(@RequestBody Map<String, Object> requestData) {
        String sessionToken = (String) requestData.get("sessionToken");
        Integer additionalMinutes = (Integer) requestData.get("additionalMinutes");
        return sessionService.extendSession(sessionToken,additionalMinutes);
    }

    @PostMapping("get-session-id")
    public ResponseEntity<?> getSessionById(@RequestBody Map<String, Object> requestData, Authentication authentication) {
        Integer sessionId = (Integer) requestData.get("sessionId");
        return sessionService.getSessionById(sessionId,authentication);
    }

}
