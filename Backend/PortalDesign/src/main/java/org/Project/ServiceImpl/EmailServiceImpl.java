package org.Project.ServiceImpl;

import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.Project.Entity.ConnectionDetails;
import org.Project.Entity.RoleMaster;
import org.Project.Repository.ConnectionRepository;
import org.Project.Service.EmailService;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Properties;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger logger = LogManager.getLogger(EmailServiceImpl.class);
    String className = "EmailServiceImpl";

    private static final String RESET_LINK = "http://localhost:5174/ResetPassword?token=";
    private static final String VERIFICATION_LINK = "http://localhost:5174/VerifyMail?token=";

    @Autowired
    ConnectionRepository connectionRepository;

    public ConnectionDetails getConnectionDetails() {
        String methodName ="getConnectionDetails";
        logger.info("{} {} ",className,methodName);
        ConnectionDetails data  = null;
        try{
            Optional<ConnectionDetails> connectionDetails = connectionRepository.findByConnectionName("EMAIL");
            if(connectionDetails.isPresent()){
                data = connectionDetails.get();
            }
        }catch (Exception e){
            logger.error("{} {} Error Exception", className, methodName, e);
        }
        return data;
    }

    @Override
    public Boolean sendVerificationEmail(String toEmail, String token) {
        String methodName ="sendVerificationEmail";
        logger.info("{} {} toEmail : {} token : {} ",className,methodName,toEmail,token);
        try{
            String subject = "Email Verification";
            String body = "<html>" +
                    "<body style=\"font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;\">" +
                    "  <div style=\"max-width: 600px; margin: auto; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0px 0px 10px #cccccc;\">" +
                    "    <h2 style=\"color: #333333;\">Email Verification</h2>" +
                    "    <p style=\"font-size: 16px; color: #333333;\">Thank you for registering. Please verify your email address by clicking the button below:</p>" +
                    "    <p style=\"text-align: center;\">" +
                    "      <a href=\"" + VERIFICATION_LINK + token + "\" style=\"display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;\">Verify Email</a>" +
                    "    </p>" +
                    "    <p style=\"font-size: 14px; color: #666666;\">If you did not sign up for this account, please ignore this email.</p>" +
                    "    <br>" +
                    "    <p style=\"font-size: 14px; color: #333333;\">Warm Regards,<br><strong>The Support Team</strong></p>" +
                    "  </div>" +
                    "</body>" +
                    "</html>";

            return sendEmail(toEmail, subject, body);
        }catch (Exception e){
            logger.error("{} {} Error Exception", className, methodName, e);
            return false;
        }
    }

    @Override
    public Boolean sendResetTokenEmail(String toEmail, String token) {
        String methodName ="sendResetTokenEmail";
        logger.info("{} {} toEmail : {} token : {} ",className,methodName,toEmail,token);
        try{
            String subject = "Password Reset Request";
            String body = "<html>" +
                    "<body style=\"font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;\">" +
                    "  <div style=\"max-width: 600px; margin: auto; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0px 0px 10px #cccccc;\">" +
                    "    <h2 style=\"color: #333333;\">Reset Your Password</h2>" +
                    "    <p style=\"font-size: 16px; color: #333333;\">You have requested to reset your password. Click the button below to proceed:</p>" +
                    "    <p style=\"text-align: center;\">" +
                    "      <a href=\"" + RESET_LINK + token + "\" style=\"display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;\">Reset Password</a>" +
                    "    </p>" +
                    "    <p style=\"font-size: 14px; color: #666666;\">This link will expire in 5 minutes. If you didn't request this, please ignore the email.</p>" +
                    "    <br>" +
                    "    <p style=\"font-size: 14px; color: #333333;\">Warm Regards,<br><strong>The Support Team</strong></p>" +
                    "  </div>" +
                    "</body>" +
                    "</html>";

            return sendEmail(toEmail, subject, body);
        }catch (Exception e){
            logger.error("{} {} Error Exception", className, methodName, e);
            return false;
        }
    }
    @Override
    public Boolean sendOtpThroughEmail(String toEmail, String otp) {
        String methodName ="sendOtpThroughEmail";
        logger.info("{} {} toEmail : {} otp : {} ",className,methodName,toEmail,otp);
        try{
            String subject = "Your One Time Password (OTP)";
            String body = "<html>" +
                    "<body style=\"font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;\">" +
                    "  <div style=\"max-width: 600px; margin: auto; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0px 0px 10px #cccccc;\">" +
                    "    <h2 style=\"color: #333333;\">Dear User,</h2>" +
                    "    <p style=\"font-size: 16px; color: #333333;\">Your One Time Password (OTP) is:</p>" +
                    "    <p style=\"font-size: 24px; font-weight: bold; color: #007bff;\">" + otp + "</p>" +
                    "    <p style=\"font-size: 14px; color: #666666;\">This OTP will expire in <strong>5 minutes</strong>.</p>" +
                    "    <p style=\"font-size: 14px; color: #cc0000;\">⚠️ Do not share your OTP with anyone, including family members.</p>" +
                    "    <br>" +
                    "    <p style=\"font-size: 14px; color: #333333;\">Warm Regards,<br><strong>The Support Team</strong></p>" +
                    "  </div>" +
                    "</body>" +
                    "</html>";

            return sendEmail(toEmail, subject, body);
        }catch (Exception e){
            logger.error("{} {} Error Exception", className, methodName, e);
            return false;
        }
    }

    public Boolean sendEmail(String toEmail, String subject, String body) {
        String methodName ="sendEmail";
        logger.info("{} {} toEmail : {} subject : {} body : {}",className,methodName,toEmail,subject,body);
        try{
            ConnectionDetails connectData = getConnectionDetails();
            Boolean success = Boolean.FALSE;
            Properties props = new Properties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.host", connectData.getHost());
            props.put("mail.smtp.port", String.valueOf(connectData.getPort()));
            Session session = Session.getInstance(props, new Authenticator() {
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(connectData.getUserName(), connectData.getPassword());
                }
            });
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress("shas9nk@gmail.com"));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(toEmail));
            message.setSubject(subject);
            message.setContent(body, "text/html; charset=utf-8");
            Transport.send(message);
            success = Boolean.TRUE;
            System.out.println("Email sent successfully to: " + toEmail);
            return success;
        }catch (Exception e){
            logger.error("{} {} Error Exception", className, methodName, e);
            return false;
        }
    }

}

