package org.Project.ServiceImpl;

import org.Project.Entity.PortalMaster;
import org.Project.Repository.PortalRepository;
import org.Project.Service.PortalService;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
@Service
public class PortalServiceImpl implements PortalService {

    @Autowired
    PortalRepository portalRepository;

    private static final Logger logger = LogManager.getLogger(PortalServiceImpl.class);
    String className = "RoleServiceImpl";

    @Override
    public ResponseEntity<?> getAllPortals() {
        String methodName ="getAllPortals";
        logger.info("{} {} ",className,methodName);
        try{
            List<PortalMaster> portalData = portalRepository.findAll();
            if(portalData.isEmpty()){
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error","No Portal Found"));
            }else{
                return ResponseEntity.ok(portalData);
            }
        }catch (Exception e){
            logger.error("{} {} Error Exception", className, methodName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error","Failed To Fetch Portals"));
        }
    }
}
