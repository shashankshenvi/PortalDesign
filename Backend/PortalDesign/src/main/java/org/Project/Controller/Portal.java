package org.Project.Controller;

import org.Project.Service.PortalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/portal/")
public class Portal {

    @Autowired
    PortalService portalService;

    @GetMapping("getPortals")
    public ResponseEntity<?> getAllPortals() {
        return portalService.getAllPortals();
    }

}
