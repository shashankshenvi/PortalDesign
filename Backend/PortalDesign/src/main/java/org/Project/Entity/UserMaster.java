package org.Project.Entity;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Data
@Entity
@Table(name = "TBL_USER_MASTER")
public class UserMaster {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "USER_ID")
	Integer userId;

	@Column(name = "USER_NAME", nullable = false, unique = true)
	String userName;

	@Column(name = "FIRST_NAME", nullable = false)
	String firstName;

	@Column(name = "LAST_NAME")
	String lastName;

	@Column(name = "EMAIL_ID", nullable = false)
	String emailId;

	@Column(name = "CONTACT_NUMBER", nullable = false)
	String contactNumber;

	@Column(name = "PASSWORD", nullable = false)
	String password;

    @Column(name = "ROLE_ID_FK")
    List<Integer> roleIdFk;

	@Column(name = "CREATED_BY")
	String createdBy;

	@Column(name = "CREATED_DATE")
	LocalDateTime createdDate = LocalDateTime.now();

	@Column(name = "MODIFIED_BY")
	String modifiedBy;

	@Column(name = "MODIFIED_DATE")
	LocalDateTime modifiedDate;

    @Column(name = "APPROVED_BY")
    String approvedBy;

    @Column(name = "APPROVED_DATE")
    LocalDateTime approvedDate;

	@Column(name = "ACTIVE_FLAG")
	Boolean activeFlag;

	@Column(name = "TOKEN")
	String token;

	@Column(name="IS_OTP_ENABLED")
	Boolean isOtpEnabled;

}
