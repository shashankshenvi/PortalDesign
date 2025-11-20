package org.Project.Controller;

import org.Project.Service.EmailService;
import org.Project.Service.UserRegistrationService;
import org.Project.ServiceImpl.EmailServiceImpl;
import org.Project.dto.UserDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user/")
public class UserRegistration {

    @Autowired
    UserRegistrationService userRegistrationService;

    @Autowired
    EmailServiceImpl emailService;

    @PostMapping("register")
    public ResponseEntity<?> registerUser(@RequestBody UserDto user) {
        return userRegistrationService.registerUser(user);
    }

    @PostMapping("getUserDetails")
    public ResponseEntity<?> getUserDetails(@RequestBody Map<String, Object> requestData) {
        String userName = (String) requestData.get("userName");
        return userRegistrationService.getUserDetails(userName);
    }

    @GetMapping("getAllUsers")
    public ResponseEntity<?> getAllUsers() {
        return userRegistrationService.getAllUsers();
    }

    @PostMapping("generateNewToken")
    public ResponseEntity<?> generateNewToken(@RequestBody Map<String, Object> requestData) {
        String emailId = (String) requestData.get("emailId");
        Integer userId = (Integer) requestData.get("userId");
        return userRegistrationService.generateNewToken(userId, emailId);
    }

    @PostMapping("updatePassword")
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, Object> requestData) {
        String newPassword = (String) requestData.get("newPassword");
        String userName = (String) requestData.get("userName");
        return userRegistrationService.updatePassword(userName, newPassword);
    }

    @PostMapping("updateProfile")
    public ResponseEntity<?> updateProfile(@RequestBody UserDto user) {
        return userRegistrationService.updateProfile(user);
    }

    @PostMapping("verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody Map<String, Object> requestData) {
        String token = (String) requestData.get("token");
        return userRegistrationService.verifyEmail(token);
    }

    @PostMapping("approveUser")
    public ResponseEntity<?> approveUser(@RequestBody Map<String, Object> requestData) {
        String userName = (String) requestData.get("userName");
        String modifiedBy = (String) requestData.get("modifiedBy");
        String status = (String) requestData.get("status");
        Integer userId = (Integer) requestData.get("userId");
        return userRegistrationService.approveUser(userName, userId, modifiedBy, status);
    }

    @PostMapping("login")
    public ResponseEntity<?> loginUser(@RequestBody UserDto user) {
        return userRegistrationService.loginUser(user.getUserName(), user.getEmailId(), user.getPassword());
    }

    @PostMapping("send-EmailReset-otp")
    public ResponseEntity<?> sendEmailResetOtp(@RequestBody Map<String, String> requestData) {
        String userName = requestData.get("userName");
        String emailId = requestData.get("emailId");
        String status = requestData.get("status");
        return userRegistrationService.sendEmailResetOtp(userName, emailId, status);
    }

    @PostMapping("send-MobileReset-otp")
    public ResponseEntity<?> sendMobileResetOtp(@RequestBody Map<String, Object> requestData) {
        String userName = (String) requestData.get("userName");
        String contactNumber = (String) requestData.get("contactNumber");
        String status = (String) requestData.get("status");
        Boolean activeFlag = (Boolean) requestData.get("activeFlag");

        return userRegistrationService.sendMobileResetOtp(userName, contactNumber, status, activeFlag);
    }

    @PostMapping("verify-EmailReset-otp")
    public ResponseEntity<?> verifyResetOtp(@RequestBody Map<String, String> request) {
        String emailId = request.get("emailId");
        String otp = request.get("otp");
        return userRegistrationService.verifyEmailOtp(emailId, otp);
    }

    @PostMapping("verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String contactNumber = request.get("contactNumber");
        String otp = request.get("otp");
        String status = request.get("status");
        String userName = request.get("userName");
        return userRegistrationService.verifyMobileOtp(contactNumber, otp, status, userName);
    }

    @GetMapping("getUserApproval")
    public ResponseEntity<?> getUserApprovals() {
        return userRegistrationService.getUserApproval();
    }
}