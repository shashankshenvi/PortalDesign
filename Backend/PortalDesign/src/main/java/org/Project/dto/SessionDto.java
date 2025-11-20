package org.Project.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SessionDto {

  Integer sessionId;
    String sessionToken;
    Integer userId;
     String userName;
    List<String> roleName;
     String status;
     String ipAddress;
    String userAgent;
    String createdBy;
     LocalDateTime createdDate;
    LocalDateTime lastSeenAt;
     LocalDateTime expiresAt;
     LocalDateTime revokedAt;
    String revokedBy;
   Map<String, Object> metaData;
     Boolean activeFlag;
     Integer ttlMinutes;
}