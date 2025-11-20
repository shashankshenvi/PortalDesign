package org.Project.ServiceImpl;

import org.Project.Entity.RoleMaster;
import org.Project.Repository.RoleRepository;
import org.Project.Service.RoleService;
import org.Project.dto.RoleDto;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cglib.core.Local;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import javax.management.relation.Role;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class RoleServiceImpl implements RoleService {

    @Autowired
    RoleRepository roleRepository;

    private static final Logger logger = LogManager.getLogger(RoleServiceImpl.class);
    String className = "RoleServiceImpl";

    @Override
    public ResponseEntity<?> createRole(RoleDto role) {
        String methodName ="createRole";
        logger.info("{} {} role : {}",className,methodName,role);
        try{
            if(role.getRoleName() ==null || role.getCreatedBy() ==null){
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error","Invalid Data"));
            }
            RoleMaster saveRole = new RoleMaster();
            saveRole.setRoleName(role.getRoleName());
            saveRole.setRoleDesc(role.getRoleDesc());
            saveRole.setCreatedBy(role.getCreatedBy());
            saveRole.setCreatedDate(LocalDateTime.now());
            saveRole.setActiveFlag(false);
            roleRepository.save(saveRole);
            return ResponseEntity.status(HttpStatus.OK).body(Collections.singletonMap("message","Role Created Successfully. Sent for Approval"));
        }catch (Exception e){
            logger.error("{} {} Error Exception", className, methodName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error","Failed To Create Role"));
        }
    }

    @Override
    public ResponseEntity<?> getRoles() {
        String methodName ="getRoles";
        logger.info("{} {} ",className,methodName);
        try{
            List<RoleMaster> roleMaster = roleRepository.findAll();
            return ResponseEntity.ok(roleMaster);
        }catch (Exception e){
            logger.error("{} {} Error Exception", className, methodName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error","Failed To Fetch Roles"));
        }
    }

    @Override
    public ResponseEntity<?> approveRole(String roleName, Integer roleId, String modifiedBy, String status) {
        String methodName ="approveRole";
        logger.info("{} {} roleName : {} roleId : {} modifiedBy : {} status : {} ",className,methodName,roleName,roleId,modifiedBy,status);
        try{
            Optional<RoleMaster> roleMaster = roleRepository.findById(roleId);
            if(roleMaster.isEmpty()){
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error","Role Does not Exists."));
            }
            RoleMaster updateRole = roleMaster.get();
            if(status.equalsIgnoreCase("Approved")){
                updateRole.setActiveFlag(true);
                updateRole.setModifiedBy(modifiedBy);
                updateRole.setModifiedDate(LocalDateTime.now());
            }else if(status.equalsIgnoreCase("Rejected")){
                updateRole.setActiveFlag(false);
                updateRole.setModifiedBy(modifiedBy);
                updateRole.setModifiedDate(LocalDateTime.now());
            }
            roleRepository.save(updateRole);
            return ResponseEntity.status(HttpStatus.OK).body(Collections.singletonMap("message","Role Approved Successfully."));
        }catch (Exception e){
            logger.error("{} {} Error Exception", className, methodName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error","Failed To "+status+" Role"));
        }
    }

    @Override
    public ResponseEntity<?> getPendingRoles() {
        String methodName ="getPendingRoles";
        logger.info("{} {} ",className,methodName);
        try{
            List<RoleMaster> roleMaster = roleRepository.findByActiveFlag(false);
            if(roleMaster.isEmpty()){
                return ResponseEntity.status(HttpStatus.OK).body(Collections.singletonMap("error","No Pending Role Approvals."));
            }
            return ResponseEntity.ok(roleMaster);
        }catch (Exception e){
            logger.error("{} {} Error Exception", className, methodName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error","Failed To Fetch Pending Roles"));
        }
    }

    @Override
    public ResponseEntity<?> updateRole(RoleDto role) {
        String methodName ="updateRole";
        logger.info("{} {} role : {}",className,methodName,role);
        try{
            if(role.getRoleName() ==null || role.getRoleId() ==null){
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error","Invalid Data"));
            }
            Optional<RoleMaster> updateRole = roleRepository.findById(role.getRoleId());
            if(updateRole.isEmpty()){
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error","Role Name or Id does not exist"));
            }
            RoleMaster update = updateRole.get();
            update.setRoleName(role.getRoleName());
            update.setRoleDesc(role.getRoleDesc());
            update.setCreatedBy(role.getCreatedBy());
            update.setCreatedDate(LocalDateTime.now());
            update.setActiveFlag(false);
            roleRepository.save(update);
            return ResponseEntity.status(HttpStatus.OK).body(Collections.singletonMap("message","Role Updated Successfully. Sent for Approval"));
        }catch (Exception e){
            logger.error("{} {} Error Exception", className, methodName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error","Failed To Create Role"));
        }    }
}
