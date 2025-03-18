package com.example.enterprise.application.module.submodule.component.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;

public interface ComplexDataProcessor<T extends Comparable<T> & AutoCloseable, R extends Number & Comparable<R>> {
    <V extends T, U extends R> void registerTypeProcessor(
            Class<V> type,
            Function<V, U> processor,
            Optional<ValidationStrategy<V>> validator);

    <X extends Comparable<X> & AutoCloseable> CompletableFuture<Map<X, List<R>>>
            processWithTransformation(
                List<T> data,
                Function<T, X> keyExtractor,
                Function<T, R> valueExtractor,
                ProcessingStrategy<T, X> strategy);

    <S extends AutoCloseable, U extends Comparable<U>> Optional<List<Map<S, List<U>>>>
            processNestedStructure(
                Map<R, List<S>> input,
                Function<S, List<U>> processor,
                ErrorHandler<S, U> errorHandler);

    interface ValidationStrategy<I> {
        boolean validate(I input) throws ValidationException;
        default CompletableFuture<Boolean> validateAsync(I input) {
            return CompletableFuture.supplyAsync(() -> {
                try {
                    return validate(input);
                } catch (ValidationException e) {
                    throw new RuntimeException(e);
                }
            });
        }
    }

    interface ProcessingStrategy<I, O> {
        O process(I input) throws ProcessingException;
        default void handleError(ProcessingException error) {
            throw new RuntimeException("Processing failed: " + error.getMessage(), error);
        }
    }

    interface ErrorHandler<I, O> {
        void handleError(I input, Exception error);
        Optional<O> recover(I input, Exception error);
    }

    class ValidationException extends Exception {
        public ValidationException(String message) {
            super(message);
        }

        public ValidationException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    class ProcessingException extends Exception {
        public ProcessingException(String message) {
            super(message);
        }

        public ProcessingException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}