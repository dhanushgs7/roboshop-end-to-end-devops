package com.instana.robotshop.shipping;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

class CalculatorTest {
    @Test
    void calculatesZeroDistanceForIdenticalCoordinates() {
        Calculator calculator = new Calculator(12.9716, 77.5946);
        assertEquals(0, calculator.getDistance(12.9716, 77.5946));
    }

    @Test
    void calculatesApproximateDistanceBetweenLondonAndParis() {
        Calculator calculator = new Calculator(48.8566, 2.3522);
        assertEquals(344, calculator.getDistance(51.5074, -0.1278), 2);
    }
}
