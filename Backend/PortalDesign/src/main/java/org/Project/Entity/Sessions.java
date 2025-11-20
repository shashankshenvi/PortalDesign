package org.Project.Entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "TBL_SESSION")
public class Sessions {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column (name ="SESSION_ID")
    Integer sessionId;

    @Column(name="SESSION_TOKEN",columnDefinition = "CHAR(64)",nullable = false,unique = true)
    String sessionToken;

    @Column(name = "USER_ID")
    Integer userId;

    @Column(name = "USER_NAME")
    String userName;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "SESSION_ROLES", joinColumns = @JoinColumn(name = "SESSION_ID"))
    @Column(name = "ROLE_NAME")
    List<String> roleName = new ArrayList<>();


    @Column(name = "STATUS")
    @Enumerated(EnumType.STRING)
    SessionStatus status;

    @Column(name = "IP_ADDRESS")
    String ipAddress;

    @Column(name = "USER_AGENT")
    String userAgent;

    @Column(name = "CREATED_BY")
    String createdBy;

    @Column(name = "CREATED_DATE")
    LocalDateTime createdDate;

    @Column(name = "LAST_SEEN_AT")
    LocalDateTime lastSeenAt;

    @Column(name = "EXPIRES_AT")
    LocalDateTime expiresAt;

    @Column(name = "REVOKED_AT")
    LocalDateTime revokedAt;

    @Column(name = "REVOKED_BY")
    String revokedBy;

    @Column(name = "META_DATA",columnDefinition = "JSON")
    String metaData;

    @Column(name = "ACTIVE_FLAG")
    Boolean activeFlag;

    public enum SessionStatus {
        PENDING, ACTIVE, EXPIRED, REVOKED, LOGGED_OUT
    }
}
