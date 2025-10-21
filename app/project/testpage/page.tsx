"use client"

import Header from "@/app/ui/header";
import { useEffect, useRef } from "react";
import Link from "next/link";

export default function TestProjectPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Audio context for dink sound
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playDink = () => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.1);
        };

        // Set canvas size to fullscreen
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Ball properties
        let ball = {
            x: canvas.width * (0.8 * Math.random() + 0.1),
            y: 50,
            radius: 20,
            vx: (2 * Math.random() - 1) * 5,
            vy: 0,
            gravity: 0.5,
            bounce: 0.8,
            friction: 0.98
        };

        // Dragging state
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        // Throwing variables
        let lastMouseX = 0;
        let lastMouseY = 0;
        let lastTime = 0;

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (!isDragging) {
                // Apply gravity
                ball.vy += ball.gravity;

                // Update positions
                ball.x += ball.vx;
                ball.y += ball.vy;

                // Collision with sides
                if (ball.x - ball.radius < 0) {
                    ball.x = ball.radius;
                    ball.vx *= -ball.bounce;
                    if (Math.abs(ball.vx) > 1) playDink();
                }
                if (ball.x + ball.radius > canvas.width) {
                    ball.x = canvas.width - ball.radius;
                    ball.vx *= -ball.bounce;
                    if (Math.abs(ball.vx) > 1) playDink();
                }

                // Collision with top (ceiling)
                if (ball.y - ball.radius < 0) {
                    ball.y = ball.radius;
                    ball.vy *= -ball.bounce;
                    if (Math.abs(ball.vy) > 1) playDink();
                }

                // Collision with bottom
                if (ball.y + ball.radius > canvas.height) {
                    ball.y = canvas.height - ball.radius;
                    ball.vy *= -ball.bounce;
                    if (Math.abs(ball.vy) > 1) playDink();
                    // If vertical velocity is low, start rolling
                    if (Math.abs(ball.vy) < 1) {
                        ball.vy = 0;
                        ball.vx *= ball.friction;
                        if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
                    }
                }
            }

            // Draw ball
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = "black";
            ctx.fill();

            requestAnimationFrame(animate);
        }

        animate();

        // Mouse event handlers
        const handleMouseDown = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const dist = Math.sqrt((mouseX - ball.x) ** 2 + (mouseY - ball.y) ** 2);
            if (dist < ball.radius) {
                isDragging = true;
                dragOffsetX = mouseX - ball.x;
                dragOffsetY = mouseY - ball.y;
                ball.vx = 0;
                ball.vy = 0;
                lastMouseX = mouseX;
                lastMouseY = mouseY;
                lastTime = Date.now();
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                ball.x = mouseX - dragOffsetX;
                ball.y = mouseY - dragOffsetY;
                // Clamp to canvas bounds
                ball.x = Math.max(ball.radius, Math.min(canvas.width - ball.radius, ball.x));
                ball.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ball.y));

                // Calculate velocity for throwing
                const currentTime = Date.now();
                const deltaTime = (currentTime - lastTime) / 1000; // in seconds
                if (deltaTime > 0) {
                    ball.vx = (mouseX - lastMouseX) / deltaTime * 0.05; // adjust factor for feel
                    ball.vy = (mouseY - lastMouseY) / deltaTime * 0.05;
                }
                lastMouseX = mouseX;
                lastMouseY = mouseY;
                lastTime = currentTime;
            }
        };

        const handleMouseUp = () => {
            isDragging = false;
        };

        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mouseup", handleMouseUp);
        canvas.addEventListener("mouseleave", handleMouseUp);

        // Handle resize
        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Clamp ball position to new canvas bounds
            ball.x = Math.max(ball.radius, Math.min(canvas.width - ball.radius, ball.x));
            ball.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ball.y));
        };
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            canvas.removeEventListener("mousedown", handleMouseDown);
            canvas.removeEventListener("mousemove", handleMouseMove);
            canvas.removeEventListener("mouseup", handleMouseUp);
            canvas.removeEventListener("mouseleave", handleMouseUp);
        };
    }, []);

    return (
        <>
            <Header pageName="testpage"/>
            <div className="physContainer" style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", overflow: "hidden", zIndex: -1 }}>
                <canvas ref={canvasRef} />
            </div>
        </>
    )
}