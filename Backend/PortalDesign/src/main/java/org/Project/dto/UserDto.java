package org.Project.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.util.List;

@Getter
@Setter
@ToString
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserDto {

	Integer userId;
	String UserName;
	String firstName;
	String lastName;
	String emailId;
	String contactNumber;
	String password;
	String createdBy;
	String createdDate;
	String modifiedBy;
	String modifiedDate;
    String approvedBy;
    String approvedDate;
	Boolean activeFlag;
	String token;
	List<Integer> roleIdFk;
	Boolean isOtpEnabled;

}
