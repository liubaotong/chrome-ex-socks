package socks5

import (
	"github.com/fatih/color"
)

type Logger struct {
	info  *color.Color
	error *color.Color
	debug *color.Color
}

func NewLogger() *Logger {
	return &Logger{
		info:  color.New(color.FgGreen),
		error: color.New(color.FgRed),
		debug: color.New(color.FgYellow),
	}
}

func (l *Logger) Info(format string, args ...interface{}) {
	l.info.Printf("[INFO] "+format+"\n", args...)
}

func (l *Logger) Error(format string, args ...interface{}) {
	l.error.Printf("[ERROR] "+format+"\n", args...)
}

func (l *Logger) Debug(format string, args ...interface{}) {
	l.debug.Printf("[DEBUG] "+format+"\n", args...)
} 