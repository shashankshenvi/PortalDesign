package org.Project.Service;

import org.Project.dto.UserDto;
import org.springframework.http.ResponseEntity;

public interface UserRegistrationService {

    ResponseEntity<?> registerUser(UserDto userDetails);

    ResponseEntity<?> getUserDetails(String userName);

    ResponseEntity<?> generateNewToken(Integer userId, String emailId);

    ResponseEntity<?> updatePassword(String userName,String newPassword);

    ResponseEntity<?> verifyEmail(String token);

    ResponseEntity<?> approveUser(String userName, Integer userId, String modifiedBy, String status);

    ResponseEntity<?> loginUser(String userName, String emailId, String password);

    ResponseEntity<?> sendEmailResetOtp(String userName, String emailId,String status);

    ResponseEntity<?> verifyEmailOtp(String emailId, String otp);

    ResponseEntity<?> updateProfile(UserDto user);

    ResponseEntity<?> getAllUsers();

    ResponseEntity<?> getUserApproval();

    ResponseEntity<?> verifyMobileOtp(String contactNumber, String otp, String otpType, String userName);

    ResponseEntity<?> sendMobileResetOtp(String userName, String contactNumber, String status, Boolean activeFlag);
}
