package com.instana.robotshop.shipping;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(Controller.class)
class ControllerTest {
    @Autowired private MockMvc mvc;
    @MockitoBean private CityRepository cityrepo;
    @MockitoBean private CodeRepository coderepo;

    @Test
    void healthReturnsOk() throws Exception {
        mvc.perform(get("/health")).andExpect(status().isOk()).andExpect(content().string("OK"));
    }

    @Test
    void countReturnsRepositoryCount() throws Exception {
        when(cityrepo.count()).thenReturn(42L);
        mvc.perform(get("/count")).andExpect(status().isOk()).andExpect(content().string("42"));
    }

    @Test
    void citiesReturnsEmptyListWhenNoCitiesMatch() throws Exception {
        when(cityrepo.findByCode("IN")).thenReturn(Collections.emptyList());
        mvc.perform(get("/cities/IN")).andExpect(status().isOk()).andExpect(content().json("[]"));
    }

    @Test
    void matchRejectsSearchTextShorterThanThreeCharacters() throws Exception {
        mvc.perform(get("/match/IN/ab")).andExpect(status().isBadRequest());
    }

    @Test
    void matchReturnsRepositoryResults() throws Exception {
        when(cityrepo.match("IN", "Bengaluru")).thenReturn(Collections.emptyList());
        mvc.perform(get("/match/IN/Bengaluru")).andExpect(status().isOk()).andExpect(content().json("[]"));
    }

    @Test
    void calculateReturnsNotFoundForUnknownCity() throws Exception {
        when(cityrepo.findById(999L)).thenReturn(null);
        mvc.perform(get("/calc/999")).andExpect(status().isNotFound());
    }
}
