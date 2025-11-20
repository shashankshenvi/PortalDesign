package org.Project.ServiceImpl;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.Project.Service.MobileService;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;


@Service
public class MobileServiceImpl implements MobileService {

    private static final Logger logger = LogManager.getLogger(MobileServiceImpl.class);
    String className ="MobileServiceImpl";

    private static final String ENDPOINT = "https://www.fast2sms.com/dev/bulkV2";
    private static final RestTemplate REST = new RestTemplate();
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String apiKey ="X3nHCLAbktjwVge260oU8zWQrNZfGiySYTIFm4BqlRpsOD7EJh4rlfpaFohHXOZq13neG0yIB765xkDj";

    @Override
    public  Boolean sendSms(String contactNumber, String otp) {
        String methodName ="sendSms";
        try{
            logger.info(className,methodName," mobile : "+contactNumber+" otp : "+otp);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("authorization", apiKey.trim());
            String message = "Your verification code is "+otp+". Do not share it with anyone. Valid for 5 minutes.";
            Map<String, Object> body = new HashMap<>();
            body.put("route",         "q");
            body.put("message",       message);
            body.put("numbers",       contactNumber);
            body.put("flash",         0);
            HttpEntity<String> request = new HttpEntity<>(JSON.writeValueAsString(body), headers);
            logger.info(className,methodName,"body : "+JSON.writeValueAsString(body));
            ResponseEntity<String> res = REST.exchange(ENDPOINT, HttpMethod.POST, request, String.class);
            logger.info(className,methodName,"Fast2SMS  " + res.getBody());
            return res.getStatusCode().is2xxSuccessful();
        }catch (Exception e) {
            logger.error("{} {} Error Exception : {}", className, methodName, e);
            return false;
        }
    }
}