package org.Project.Repository;

import java.util.List;
import java.util.Optional;

import org.Project.Entity.UserMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<UserMaster,Integer> {
    Optional<UserMaster> findByUserName(String userName);
	Optional<UserMaster> findByUserNameAndActiveFlag(String userName,Boolean activeFlag);
	Optional<UserMaster> findByEmailIdAndActiveFlag(String emailId,Boolean activeFlag);
    Optional<UserMaster> findByContactNumberAndActiveFlag(String contactNumber, Boolean activeFlag);
}
