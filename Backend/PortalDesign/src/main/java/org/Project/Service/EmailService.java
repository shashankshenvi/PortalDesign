package org.Project.Service;

public interface EmailService {

    Boolean sendVerificationEmail(String toEmail, String token);

    Boolean sendResetTokenEmail(String toEmail, String token);

    Boolean sendOtpThroughEmail(String toEmail, String token);

}
