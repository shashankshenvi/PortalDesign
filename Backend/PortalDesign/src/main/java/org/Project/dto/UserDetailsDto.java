package org.Project.dto;

import lombok.Data;
import org.Project.Entity.RoleMaster;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class UserDetailsDto {

    Integer userId;
    String UserName;
    String firstName;
    String lastName;
    String emailId;
    String contactNumber;
    String password;
    String createdBy;
    LocalDateTime createdDate;
    String modifiedBy;
    LocalDateTime modifiedDate;
    String approvedBy;
    LocalDateTime approvedDate;
    Boolean activeFlag;
    String token;
    List<Integer> roleIdFk;
    Boolean isOtpEnabled;
    List<RoleMaster> roles;
}
