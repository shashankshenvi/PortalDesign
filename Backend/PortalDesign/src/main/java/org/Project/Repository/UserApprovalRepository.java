package org.Project.Repository;

import org.Project.Entity.UserApproval;
import org.Project.Entity.UserMaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserApprovalRepository extends JpaRepository<UserApproval, Integer> {
    Optional<UserApproval> findByToken(String token);
    List<UserApproval> findByActiveFlag(Boolean activeFlag);
    Optional<UserApproval> findTopByUserNameAndActiveFlagTrueOrderByCreatedDateDesc(String userName);
}
