package org.Project.ServiceImpl;

import org.Project.Entity.*;
import org.Project.Repository.*;
import org.Project.Service.EmailService;
import org.Project.Service.MobileService;
import org.Project.Service.UserRegistrationService;
import org.Project.dto.UserDetailsDto;
import org.Project.dto.UserDto;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class UserRegistrationServiceImpl implements UserRegistrationService {

    @Autowired
    UserRepository userRepository;

    @Autowired
    UserApprovalRepository userApprovalRepository;

    @Autowired
    UserOtpRepository userOtpRepository;

    @Autowired
    Encryption encryption;

    @Autowired
    EmailService emailService;

    @Autowired
    MobileService mobileService;

    @Autowired
    RoleRepository roleRepository;

    private static final Logger logger = LogManager.getLogger(UserRegistrationServiceImpl.class);
    String className = "UserRegistrationServiceImpl";

    final SecureRandom random = new SecureRandom();

    public String generateOtp() {
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    @Override
    @Transactional
    public ResponseEntity<?> registerUser(UserDto userDetails) {
        String methodName = "registerUser";
        logger.info("{} {} userDetails : {}", className, methodName, userDetails);
        try {
            // basic null / blank checks
            if (userDetails == null
                    || userDetails.getUserName() == null || userDetails.getUserName().isBlank()
                    || userDetails.getFirstName() == null || userDetails.getFirstName().isBlank()
                    || userDetails.getEmailId() == null || userDetails.getEmailId().isBlank()
                    || userDetails.getContactNumber() == null || userDetails.getContactNumber().isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Collections.singletonMap("error", "Invalid Data"));
            }

            if (userRepository.findByUserNameAndActiveFlag(userDetails.getUserName(), true).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Collections.singletonMap("error", "User Already Exists"));
            }

            UserMaster saveUser = new UserMaster();
            saveUser.setUserName(userDetails.getUserName());
            saveUser.setFirstName(userDetails.getFirstName());
            saveUser.setLastName(userDetails.getLastName());
            saveUser.setCreatedBy(userDetails.getCreatedBy());
            saveUser.setCreatedDate(LocalDateTime.now());
            // encrypt password before saving
            saveUser.setPassword(encryption.encrypt(userDetails.getPassword()));
            saveUser.setEmailId(userDetails.getEmailId());
            saveUser.setRoleIdFk(userDetails.getRoleIdFk());
            saveUser.setContactNumber(userDetails.getContactNumber());
            String verificationToken = UUID.randomUUID().toString();
            saveUser.setToken(verificationToken);
            saveUser.setActiveFlag(false);
            saveUser.setIsOtpEnabled(userDetails.getIsOtpEnabled());
            UserMaster savedUser = userRepository.save(saveUser);

            // create approval entry
            UserApproval userApproval = new UserApproval();
            userApproval.setUserName(savedUser.getUserName());
            userApproval.setUserId(savedUser.getUserId());
            userApproval.setContactNumber(savedUser.getContactNumber());
            userApproval.setToken(verificationToken);
            userApproval.setEmailId(userDetails.getEmailId());
            userApproval.setStatus(UserApproval.Status.PENDING);
            userApproval.setCreatedBy(userDetails.getCreatedBy());
            userApproval.setCreatedDate(LocalDateTime.now());
            userApproval.setIsApproved(false);
            userApproval.setActiveFlag(true);
            userApproval.setIsEmailVerified(false);
            userApprovalRepository.save(userApproval);

            // create OTP record for verification (phone)
            UserOtp otpEntry = new UserOtp();
            otpEntry.setUserId(savedUser.getUserId());
            otpEntry.setUserName(savedUser.getUserName());
            otpEntry.setEmailId(null);
            otpEntry.setContactNumber(saveUser.getContactNumber());
            String otp = generateOtp();
            otpEntry.setOtp(otp);
            otpEntry.setExpiryTime(LocalDateTime.now().plusMinutes(5));
            otpEntry.setOtpType(UserOtp.OtpType.VERIFICATION);
            otpEntry.setIsOtpUsed(false);
            otpEntry.setActiveFlag(true);
            userOtpRepository.save(otpEntry);

            // send OTP/email - currently stubs in your code, call actual services if available
            boolean isOtpSuccess = true;
            boolean isEmailSuccess = true;
            // Uncomment & use real services:
            // isOtpSuccess = mobileService.sendSms(saveUser.getContactNumber(), otp);
            // isEmailSuccess = emailService.sendVerificationEmail(userDetails.getEmailId(), verificationToken);

            if (isOtpSuccess && isEmailSuccess) {
                return ResponseEntity.status(HttpStatus.OK).body(Collections.singletonMap("message", "User registered successfully! Please check your email for verification."));
            } else {
                // if either failed, you might want to rollback or mark user approval accordingly — currently just return 500
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error", "Failed To Register User"));
            }
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error", "Failed To Register User"));
        }
    }

    public ResponseEntity<?> getUserDetails(String userName) {
        String methodName = "getUserDetails";
        logger.info("{} {} userName : {}", className, methodName, userName);
        try {
            if (userName == null || userName.isBlank()) {
                return ResponseEntity.badRequest().body(Collections.singletonMap("error", "userName required"));
            }
            Optional<UserMaster> userData = userRepository.findByUserNameAndActiveFlag(userName, true);
            if (userData.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error", "User Not Found"));
            }
            UserMaster user = userData.get();
            UserDetailsDto userDto = new UserDetailsDto();
            userDto.setUserName(user.getUserName());
            userDto.setUserId(user.getUserId());
            userDto.setFirstName(user.getFirstName());
            userDto.setLastName(user.getLastName());
            userDto.setCreatedBy(user.getCreatedBy());
            userDto.setCreatedDate(user.getCreatedDate());
            userDto.setModifiedBy(user.getModifiedBy());
            userDto.setModifiedDate(user.getModifiedDate());
            userDto.setApprovedBy(user.getApprovedBy());
            userDto.setApprovedDate(user.getApprovedDate());
            // decrypt password only if absolutely necessary (avoid sending back in many flows)
            userDto.setPassword(encryption.decrypt(user.getPassword()));
            userDto.setEmailId(user.getEmailId());
            userDto.setRoleIdFk(user.getRoleIdFk());
            userDto.setContactNumber(user.getContactNumber());
            userDto.setActiveFlag(user.getActiveFlag());
            userDto.setIsOtpEnabled(user.getIsOtpEnabled());

            if (user.getRoleIdFk() != null && !user.getRoleIdFk().isEmpty()) {
                List<RoleMaster> getRoles = roleRepository.findByRoleIdInAndActiveFlag(user.getRoleIdFk(), true);
                userDto.setRoles(getRoles);
            } else {
                userDto.setRoles(Collections.emptyList());
            }

            return ResponseEntity.ok(userDto);
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error", "Failed To Fetch Data"));
        }
    }

    @Override
    public ResponseEntity<?> generateNewToken(Integer userId, String emailId) {
        String methodName = "generateNewToken";
        logger.info("{} {} userId : {} emailId : {} ", className, methodName, userId, emailId);
        try {
            if (emailId == null || emailId.isBlank()) {
                return ResponseEntity.badRequest().body(Collections.singletonMap("error", "emailId required"));
            }
            Optional<UserMaster> userData = userRepository.findByEmailIdAndActiveFlag(emailId, true);
            if (userData.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error", "Email Does not Exist"));
            }
            UserMaster updateToken = userData.get();
            String verificationToken = UUID.randomUUID().toString();
            updateToken.setToken(verificationToken);
            userRepository.save(updateToken);

            boolean success = true;
            // success = emailService.sendVerificationEmail(emailId, verificationToken);
            if (success) {
                return ResponseEntity.status(HttpStatus.OK).body(Collections.singletonMap("message", "Please check your email for verification."));
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error", "Failed to Generate new Token"));
            }
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error", "Failed To Generate New Token"));
        }
    }

    @Override
    public ResponseEntity<?> updatePassword(String userName, String newPassword) {
        String methodName = "updatePassword";
        logger.info("{} {} userName : {}", className, methodName, userName);
        try {
            if (userName == null || userName.isBlank() || newPassword == null || newPassword.isBlank()) {
                return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Invalid payload"));
            }
            Optional<UserMaster> userData = userRepository.findByUserNameAndActiveFlag(userName, true);
            if (userData.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error", "User Does not Exist."));
            }
            UserMaster updatePassword = userData.get();
            updatePassword.setPassword(encryption.encrypt(newPassword)); // encrypt before saving
            userRepository.save(updatePassword);
            return ResponseEntity.status(HttpStatus.OK).body(Collections.singletonMap("message", "Password Updated Successfully."));
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error", "Failed To Update Password"));
        }
    }

    @Override
    @Transactional
    public ResponseEntity<?> verifyEmail(String token) {
        String methodName = "verifyEmail";
        logger.info("{} {} token : {} ", className, methodName, token);

        try {
            if (token == null || token.isBlank()) {
                return ResponseEntity.badRequest().body(Collections.singletonMap("error", "token required"));
            }
            Optional<UserApproval> userData = userApprovalRepository.findByToken(token);
            if (userData.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error", "Invalid or expired token"));
            }

            UserApproval approval = userData.get();
            if (Boolean.TRUE.equals(approval.getIsEmailVerified())) {
                return ResponseEntity.ok(Collections.singletonMap("message", "Email already verified"));
            }
            approval.setIsEmailVerified(true);
            approval.setModifiedBy("SYSTEM MODIFIED");
            approval.setModifiedDate(LocalDateTime.now());
            userApprovalRepository.save(approval);
            if (!Boolean.TRUE.equals(approval.getIsMobileVerified())) {
                return ResponseEntity.ok(Collections.singletonMap("message", "Email Verified Successfully, Kindly verify ContactNumber"));
            }
            return ResponseEntity.ok(Collections.singletonMap("message", "Email Verified Successfully, Wait for User Approval"));
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed To Verify Email"));
        }
    }

    @Override
    @Transactional
    public ResponseEntity<?> approveUser(String userName, Integer userId, String modifiedBy, String status) {
        String methodName = "approveUser";
        logger.info("{} {} userName: {} userId: {} modifiedBy: {} status: {}", className, methodName, userName, userId, modifiedBy, status);

        try {
            if (userName == null || userName.isBlank() || userId == null) {
                return ResponseEntity.badRequest().body(Collections.singletonMap("error", "UserName and UserId are required"));
            }
            if (status == null || status.isBlank()) {
                return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Status is required (Approved or Rejected)"));
            }
            Optional<UserApproval> approvalOpt = userApprovalRepository.findTopByUserNameAndActiveFlagTrueOrderByCreatedDateDesc(userName);
            if (approvalOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error", "Approval record does not exist."));
            }
            UserApproval approval = approvalOpt.get();
            if (!Objects.equals(approval.getUserId(), userId)) {
                logger.warn("{} {} mismatch: approval.userId={} provided userId={}", className, methodName, approval.getUserId(), userId);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Collections.singletonMap("error", "Provided userId does not match approval record"));
            }
            if (approval.getStatus() == UserApproval.Status.APPROVED) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Collections.singletonMap("message", "Approval already approved"));
            }
            if (approval.getStatus() == UserApproval.Status.REJECTED) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Collections.singletonMap("message", "Approval already rejected"));
            }
            String actor = (modifiedBy == null || modifiedBy.isBlank()) ? "SYSTEM" : modifiedBy;
            UserMaster user = userRepository.findById(approval.getUserId()).orElseThrow(() -> new NoSuchElementException("User Not Found"));
            if ("Approved".equalsIgnoreCase(status)) {
                approval.setApprovedBy(actor);
                approval.setIsApproved(true);
                approval.setActiveFlag(false);
                approval.setStatus(UserApproval.Status.APPROVED);
                approval.setApprovedDate(LocalDateTime.now());
                user.setActiveFlag(true);
                user.setApprovedBy(actor);
                user.setApprovedDate(LocalDateTime.now());
            } else if ("Rejected".equalsIgnoreCase(status)) {
                approval.setApprovedBy(actor);
                approval.setIsApproved(false);
                approval.setActiveFlag(false);
                approval.setStatus(UserApproval.Status.REJECTED);
                approval.setApprovedDate(LocalDateTime.now());
                user.setActiveFlag(false);
                user.setApprovedBy(actor);
                user.setApprovedDate(LocalDateTime.now());
            } else {
                return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Invalid status; expected Approved or Rejected"));
            }
            userApprovalRepository.save(approval);
            userRepository.save(user);
            return ResponseEntity.ok(Collections.singletonMap("message", "User approval updated successfully."));
        }catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error", "Failed To Approve User"));
        }
    }

    @Override
    public ResponseEntity<?> loginUser(String userName, String emailId, String password) {
        String methodName = "loginUser";
        logger.info("{} {} userName : {} emailId : {}", className, methodName, userName, emailId);
        try {
            Optional<UserMaster> userOpt = Optional.empty();
            if (userName != null && !userName.trim().isEmpty()) {
                userOpt = userRepository.findByUserNameAndActiveFlag(userName, true);
            } else if (emailId != null && !emailId.trim().isEmpty()) {
                userOpt = userRepository.findByEmailIdAndActiveFlag(emailId, true);
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Username or Email must be provided"));
            }

            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found"));
            }
            UserMaster user = userOpt.get();
            if (!encryption.matches(password, user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid username/email or password"));
            }

            if (Boolean.TRUE.equals(user.getIsOtpEnabled())) {
                String otp = generateOtp();

                UserOtp userOtp = new UserOtp();
                userOtp.setEmailId(user.getEmailId());
                userOtp.setContactNumber(user.getContactNumber());
                userOtp.setOtp(otp);
                userOtp.setExpiryTime(LocalDateTime.now().plusMinutes(5));
                userOtp.setIsOtpUsed(false);
                userOtp.setUserName(user.getUserName());
                userOtp.setUserId(user.getUserId());
                userOtp.setActiveFlag(true);
                userOtp.setOtpType(UserOtp.OtpType.LOGIN);
                userOtpRepository.save(userOtp);

                // mobileService.sendSms(user.getContactNumber(), otp);
                // emailService.sendOtpThroughEmail(user.getEmailId(), otp);

                return ResponseEntity.ok(Map.of(
                        "message", "OTP sent to your Mobile Number and Email Id",
                        "otpRequired", true,
                        "emailId", user.getContactNumber(),
                        "userName", user.getUserName()
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Logged in successfully",
                    "otpRequired", false,
                    "userName", user.getUserName()
            ));
        } catch (Exception e) {
            logger.error("{} {} Exception occurred while processing request: {}", className, methodName, e.toString(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "An error occurred while processing the request"));
        }
    }

    @Override
    public ResponseEntity<?> sendEmailResetOtp(String userName, String emailId, String status) {
        String methodName = "sendResetOtp";
        logger.info("{} {} userName : {} emailId : {} status : {}", className, methodName, userName, emailId, status);
        try {
            Optional<UserMaster> userOpt = Optional.empty();

            if (userName != null && !userName.trim().isEmpty()) {
                userOpt = userRepository.findByUserNameAndActiveFlag(userName, true);
            } else if (emailId != null && !emailId.trim().isEmpty()) {
                userOpt = userRepository.findByEmailIdAndActiveFlag(emailId, true);
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Username or Email must be provided"));
            }
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Invalid username or email"));
            }
            UserMaster user = userOpt.get();
            UserOtp userOtp = new UserOtp();
            userOtp.setUserName(user.getUserName());
            userOtp.setUserId(user.getUserId());
            userOtp.setEmailId(user.getEmailId());
            userOtp.setIsOtpUsed(false);
            userOtp.setActiveFlag(true);
            userOtp.setExpiryTime(LocalDateTime.now().plusMinutes(5));
            String otpGenerated = generateOtp();
            userOtp.setOtp(otpGenerated);
            try {
                userOtp.setOtpType(UserOtp.OtpType.valueOf(status.toUpperCase()));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid OTP type"));
            }
            userOtpRepository.save(userOtp);
            boolean emailSent = true;
            // emailSent = emailService.sendOtpThroughEmail(user.getEmailId(), otpGenerated);
            if (emailSent) {
                return ResponseEntity.ok(Map.of("message", "OTP has been sent to your email"));
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to send OTP"));
            }
        } catch (Exception e) {
            logger.error("{} {} Exception occurred while processing request: {}", className, methodName, e.toString(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "An error occurred while processing the request"));
        }
    }

    @Override
    public ResponseEntity<?> sendMobileResetOtp(String userName, String contactNumber, String status,Boolean activeFlag) {
        String methodName = "sendResetOtp";
        logger.info("{} {} userName : {} contactNumber : {} status : {} activeFlag : {} activeFlag", className, methodName, userName, contactNumber, status,activeFlag);
        try {
            Optional<UserMaster> userOpt = null;
            if (userName != null && !userName.trim().isEmpty()) {
                userOpt = userRepository.findByUserNameAndActiveFlag(userName, activeFlag);
            }else if(contactNumber !=null && !contactNumber.trim().isEmpty()){
                userOpt = userRepository.findByContactNumberAndActiveFlag(contactNumber, activeFlag);

            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Username or ContactNumber must be provided"));
            }
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Invalid username"));
            }
            UserMaster user = userOpt.get();
            UserOtp userOtp = new UserOtp();
            userOtp.setUserName(user.getUserName());
            userOtp.setUserId(user.getUserId());
            userOtp.setContactNumber(user.getContactNumber());
            userOtp.setEmailId(user.getEmailId());
            userOtp.setIsOtpUsed(false);
            userOtp.setActiveFlag(true);
            userOtp.setExpiryTime(LocalDateTime.now().plusMinutes(5));
            String otpGenerated = generateOtp();
            userOtp.setOtp(otpGenerated);
            userOtp.setOtpType(UserOtp.OtpType.valueOf(status.toUpperCase()));
            userOtpRepository.save(userOtp);
            boolean OtpSent = true;
            // OtpSent = mobileService.sendSms(contactNumber, otpGenerated);
            if (OtpSent) {
                return ResponseEntity.ok(Map.of("message", "OTP has been sent to your ContactNumber"));
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to send OTP"));
            }
        } catch (Exception e) {
            logger.error("{} {} Exception occurred while processing request: {}", className, methodName, e.toString(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "An error occurred while processing the request"));
        }
    }

    @Override
    @Transactional
    public ResponseEntity<?> verifyEmailOtp(String emailId, String otp) {
        String methodName = "verifyEmailOtp";
        logger.info("{} {} emailId : {}", className, methodName, emailId);
        try {
            if (emailId == null || emailId.isBlank() || otp == null || otp.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "emailId and otp required"));
            }

            Optional<UserOtp> userOtpOpt = userOtpRepository.findTopByEmailIdAndOtpTypeAndIsOtpUsedFalseAndActiveFlagOrderByExpiryTimeDesc(emailId, UserOtp.OtpType.VERIFICATION, true);
            if (userOtpOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "No valid OTP found for this email"));
            }
            UserOtp userOtp = userOtpOpt.get();

            if (userOtp.getExpiryTime().isBefore(LocalDateTime.now())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "OTP has expired"));
            }

            if (!otp.equals(userOtp.getOtp())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Invalid OTP"));
            }

            userOtp.setIsOtpUsed(true);
            userOtp.setActiveFlag(false);
            userOtpRepository.save(userOtp);
            return ResponseEntity.ok(Map.of("message", "Email verified successfully"));
        } catch (Exception e) {
            logger.error("{} {} Exception occurred while processing request: {}", className, methodName, e.toString(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "An error occurred while processing the request"));
        }
    }

    @Override
    @Transactional
    public ResponseEntity<?> verifyMobileOtp(String contactNumber, String otp, String otpTypeStr, String userName) {
        String methodName = "verifyMobileOtp";
        logger.info("{} {} otp : {} contactNumber : {} userName : {} otpType : {}", className, methodName, otp, contactNumber, userName, otpTypeStr);
        try {
            if (contactNumber == null || contactNumber.isBlank() || otp == null || otp.isBlank() || otpTypeStr == null || otpTypeStr.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "contactNumber, otp, otpType required"));
            }
            UserOtp.OtpType otpType;
            try {
                otpType = UserOtp.OtpType.valueOf(otpTypeStr.toUpperCase());
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid OTP type"));
            }

            Optional<UserOtp> otpEntry = userOtpRepository.findLatestOtp(userName, contactNumber, otp, otpType);
            if (otpEntry.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Invalid or already used OTP"));
            }
            UserOtp userOtp = otpEntry.get();

            if (userOtp.getExpiryTime().isBefore(LocalDateTime.now())) {
                userOtp.setIsOtpUsed(true);
                userOtp.setActiveFlag(false);
                userOtpRepository.save(userOtp);
                return ResponseEntity.status(HttpStatus.GONE).body(Map.of("error", "OTP has expired"));
            }
            userOtp.setIsOtpUsed(true);
            userOtp.setActiveFlag(false);
            userOtpRepository.save(userOtp);

            if (UserOtp.OtpType.LOGIN.equals(otpType)) {
                return ResponseEntity.ok(Map.of("message", "Login OTP verified successfully"));
            }
            if (UserOtp.OtpType.RESET.equals(otpType)) {
                return ResponseEntity.ok(Map.of("message", "Reset OTP verified successfully"));
            }
            if (UserOtp.OtpType.VERIFICATION.equals(otpType)) {
                UserMaster user = userRepository.findByUserNameAndActiveFlag(userName, false).orElseThrow(() -> new RuntimeException("User not found"));
                Optional<UserApproval> approvalOpt = userApprovalRepository.findTopByUserNameAndActiveFlagTrueOrderByCreatedDateDesc(user.getUserName());
                if (approvalOpt.isPresent()) {
                    UserApproval approval = approvalOpt.get();
                    approval.setIsMobileVerified(true);
                    approval.setModifiedDate(LocalDateTime.now());
                    userApprovalRepository.save(approval);
                }
                Optional<UserApproval> currentApproval = userApprovalRepository.findTopByUserNameAndActiveFlagTrueOrderByCreatedDateDesc(user.getUserName());
                if (currentApproval.isPresent() && Boolean.FALSE.equals(currentApproval.get().getIsEmailVerified())) {
                    return ResponseEntity.ok(Map.of("message", "Mobile OTP verified successfully, Kindly verify your Email"));
                }
                return ResponseEntity.ok(Map.of("message", "Mobile OTP verified successfully"));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Unhandled OTP flow"));
        } catch (Exception e) {
            logger.error("{} {} Exception occurred while processing request: {}", className, methodName, e.toString(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "An error occurred while processing the request"));
        }
    }

    @Override
    @Transactional
    public ResponseEntity<?> updateProfile(UserDto user) {
        String methodName = "updateProfile";
        try {
            logger.info("{} {} user : {}", className, methodName, user);

            if (user == null || user.getUserId() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "userId required"));
            }

            UserMaster updateUser = userRepository.findById(user.getUserId()).orElse(null);
            if (updateUser == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
            }
            boolean emailChanged = user.getEmailId() != null && !Objects.equals(updateUser.getEmailId(), user.getEmailId());
            boolean mobileChanged = user.getContactNumber() != null && !Objects.equals(updateUser.getContactNumber(), user.getContactNumber());
            if (user.getFirstName() != null) updateUser.setFirstName(user.getFirstName());
            if (user.getLastName() != null) updateUser.setLastName(user.getLastName());
            if (user.getEmailId() != null) updateUser.setEmailId(user.getEmailId());
            if (user.getContactNumber() != null) updateUser.setContactNumber(user.getContactNumber());
            if (user.getIsOtpEnabled() != null) updateUser.setIsOtpEnabled(user.getIsOtpEnabled());
            if (user.getRoleIdFk() != null) updateUser.setRoleIdFk(user.getRoleIdFk());
            if (user.getPassword() != null && !user.getPassword().isBlank()) {
                updateUser.setPassword(encryption.encrypt(user.getPassword()));
            }
            if (emailChanged || mobileChanged) {
                updateUser.setActiveFlag(false);
            }
            updateUser.setModifiedDate(LocalDateTime.now());
            UserMaster savedUser = userRepository.save(updateUser);
            if (!emailChanged && !mobileChanged) {
                return ResponseEntity.ok(Map.of("message", "Profile updated successfully."));
            }
            Optional<UserApproval> approvalOpt = userApprovalRepository.findTopByUserNameAndActiveFlagTrueOrderByCreatedDateDesc(savedUser.getUserName());
            UserApproval approval = approvalOpt.orElseGet(() -> {
                UserApproval ua = new UserApproval();
                ua.setUserName(savedUser.getUserName());
                ua.setCreatedDate(LocalDateTime.now());
                ua.setActiveFlag(true);
                return ua;
            });
            if (emailChanged) {
                approval.setIsEmailVerified(false);
                String emailToken = UUID.randomUUID().toString();
                approval.setToken(emailToken);
                approval.setEmailId(savedUser.getEmailId());
            }
            if (mobileChanged) {
                approval.setIsMobileVerified(false);
                approval.setContactNumber(savedUser.getContactNumber());
            }
            approval.setModifiedDate(LocalDateTime.now());
            approval.setActiveFlag(true);
            userApprovalRepository.save(approval);
            StringBuilder msg = new StringBuilder("Profile updated successfully.");
            if (emailChanged) {
                String tokenToSend = approval.getToken();
                boolean sent = true;
                // sent = emailService.sendVerificationEmail(savedUser.getEmailId(), tokenToSend);
                msg.append(sent ? " Email verification sent." : " Email verification FAILED.");
            }
            if (mobileChanged && Boolean.TRUE.equals(savedUser.getIsOtpEnabled())) {
                String otp = generateOtp();
                UserOtp otpEntry = new UserOtp();
                otpEntry.setUserId(savedUser.getUserId());
                otpEntry.setUserName(savedUser.getUserName());
                otpEntry.setContactNumber(savedUser.getContactNumber());
                otpEntry.setEmailId(savedUser.getEmailId());
                otpEntry.setOtp(otp);
                otpEntry.setOtpType(UserOtp.OtpType.VERIFICATION);
                otpEntry.setExpiryTime(LocalDateTime.now().plusMinutes(5));
                otpEntry.setIsOtpUsed(false);
                userOtpRepository.save(otpEntry);
                // mobileService.sendSms(savedUser.getContactNumber(), otp);
                msg.append(" Mobile OTP sent.");
            }

            return ResponseEntity.ok(Map.of("message", msg.toString().trim()));
        } catch (Exception e) {
            logger.error("{} {} Exception occurred while processing request: {}", className, methodName, e.toString(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "An error occurred while processing the request"));
        }
    }

    @Override
    public ResponseEntity<?> getAllUsers() {
        String methodName = "getAllUsers";
        logger.info("{} {} ", className, methodName);
        try {
            List<UserMaster> getUser = userRepository.findAll();
            return ResponseEntity.ok(getUser);
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error", "Failed To Fetch All Users"));
        }
    }

    @Override
    public ResponseEntity<?> getUserApproval() {
        String methodName = "getUserApproval";
        logger.info("{} {} ", className, methodName);
        try {
            List<Map<String, Object>> finalOutput = new ArrayList<>();
            List<UserApproval> userApprovals = userApprovalRepository.findByActiveFlag(true);
            if (userApprovals.isEmpty()) {
                return ResponseEntity.ok(Map.of("error", "No Pending Approvals"));
            }
            for (UserApproval data : userApprovals) {
                Map<String, Object> map = new HashMap<>();
                UserMaster user = userRepository.findById(data.getUserId())
                        .orElseThrow(() -> new RuntimeException("User Not Found"));
                map.put("approvalId", data.getApprovalId());
                map.put("userName", data.getUserName());
                map.put("userId", data.getUserId());
                map.put("isApproved", data.getIsApproved());
                map.put("approvedBy", data.getApprovedBy());
                map.put("createdBy", user.getCreatedBy());
                map.put("isMobileVerified", data.getIsMobileVerified());
                map.put("isEmailVerified", data.getIsEmailVerified());
                List<String> getRoles = roleRepository.findAllRoleNames(true, user.getRoleIdFk());
                map.put("roleName", getRoles);
                finalOutput.add(map);
            }
            return ResponseEntity.ok(finalOutput);
        } catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error", "Failed To Fetch User Approvals"));
        }
    }
}