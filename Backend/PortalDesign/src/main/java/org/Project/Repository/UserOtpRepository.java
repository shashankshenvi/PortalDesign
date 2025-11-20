package org.Project.Repository;

import org.Project.Entity.UserMaster;
import org.Project.Entity.UserOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserOtpRepository extends JpaRepository<UserOtp,Integer> {

    @Query("SELECT u FROM UserOtp u WHERE u.userName = :userName AND u.contactNumber = :contactNumber AND u.otp = :otp AND u.isOtpUsed = false AND u.otpType = :otpType ORDER BY u.expiryTime DESC LIMIT 1")
    Optional<UserOtp> findLatestOtp(@Param("userName") String userName,@Param("contactNumber") String contactNumber, @Param("otp") String otp, @Param("otpType") UserOtp.OtpType otpType);
    Optional<UserOtp> findTopByEmailIdAndOtpTypeAndIsOtpUsedFalseAndActiveFlagOrderByExpiryTimeDesc(String emailId, UserOtp.OtpType otpType, Boolean activeFlag);

}
