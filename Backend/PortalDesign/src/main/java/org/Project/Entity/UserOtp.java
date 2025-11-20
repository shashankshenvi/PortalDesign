package org.Project.Entity;

import jakarta.persistence.*;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Date;

@Data
@Entity
@Table(name = "TBL_USER_OTP")
public class UserOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "OTP_ID")
    public Integer otpId;

    @Column(name = "USER_ID")
    public Integer userId;

    @Column(name = "USER_NAME")
    public String userName;

    @Column(name="EMAIL_ID")
    public String emailId;

    @Column(name = "CONTACT_NUMBER")
    public String contactNumber;

    @Column(name = "OTP")
    public String otp;

    @Column(name="EXPIRY_TIME")
    public LocalDateTime expiryTime;

    @Column(name="IS_OTP_USED")
    public Boolean isOtpUsed;

    @Column(name = "OTP_TYPE")
    @Enumerated(EnumType.STRING)
    public OtpType otpType;

    @Column(name="ACTIVE_FLAG")
    public Boolean activeFlag;

    public enum OtpType {
        LOGIN, RESET, VERIFICATION
    }
}
