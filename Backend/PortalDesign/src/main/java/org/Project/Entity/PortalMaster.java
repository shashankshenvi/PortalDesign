package org.Project.Entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "TBL_PORTAL")
public class PortalMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "PORTAL_ID")
    Integer portalId;

    @Column(name = "PORTAL_NAME")
    String portalName;

    @Column(name="PORTAL_DESC")
    String portalDesc;

    @Column(name="PORTAL_URL")
    String portalUrl;

    @Column(name="ACTIVE_FLAG")
    Boolean activeFlag;
    

}
