package org.Project.Entity;

import jakarta.persistence.*;
import lombok.Data;


import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "TBL_USER_APPROVAL")
public class UserApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "APPROVAL_ID")
    Integer approvalId;

    @Column(name = "USER_NAME", nullable = false)
    String userName;

    @Column(name ="USER_ID",nullable = false)
    Integer userId;

    @Column(name = "CONTACT_NUMBER")
    String contactNumber;

    @Column(name = "EMAIL_ID")
    String emailId;

    @Column(name ="TOKEN")
    String token;

    @Column(name = "CREATED_BY")
    String createdBy;

    @Column(name = "CREATED_DATE")
    LocalDateTime createdDate;

    @Column(name = "MODIFIED_BY")
    String modifiedBy;

    @Column(name = "MODIFIED_DATE")
    LocalDateTime modifiedDate;

    @Column(name = "APPROVED_BY")
    String approvedBy;

    @Column(name ="APPROVED_DATE")
    LocalDateTime approvedDate;

    @Column(name ="IS_APPROVED")
    Boolean  isApproved = Boolean.FALSE;

    @Column(name ="IS_EMAIL_VERIFIED")
    Boolean isEmailVerified = Boolean.FALSE;

    @Column(name ="IS_MOBILE_VERIFIED")
    Boolean isMobileVerified = Boolean.FALSE;

    @Column(name = "ACTIVE_FLAG")
    Boolean activeFlag;

    @Column(name = "STATUS",nullable = false)
    @Enumerated(EnumType.STRING)
    Status status = Status.PENDING;

    public enum Status {
        PENDING, APPROVED, REJECTED
    }

}
